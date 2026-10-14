import type { CartProduct, CartItem, CartAction, CartQuantityLimits, CartStorageSnapshot, CartValidationResult, CartPagination } from "@/lib/cart/types"
import type { ProductHit, ProductRecord } from "@/lib/catalog/types"
import { algolia_indices, search_client } from "@/lib/algolia/algolia"

type QuantityProduct = Pick<CartProduct, "b2c_min_order_quantity" | "b2c_max_order_quantity" | "b2c_step_quantity">

/**
 * Comprueba que un valor sea un objeto sin aceptar arreglos ni valores nulos.
 * @param value Valor cuyo contenido todavía no se ha comprobado.
 * @returns Indica si se pueden inspeccionar sus propiedades.
 */
function is_record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

/**
 * Verifica que un campo de texto contenga información después de quitar espacios externos.
 * @param value Campo recibido del almacenamiento o del catálogo.
 * @returns Indica si es una cadena no vacía.
 */
function is_nonempty_string(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

/**
 * Rechaza importes negativos, no finitos o que desbordan la precisión monetaria.
 * @param value Precio unitario que se desea comprobar.
 * @param quantity Cantidad con la que se calculará el subtotal.
 * @returns Indica si el importe puede utilizarse sin desbordamientos.
 */
function is_valid_price(value: unknown, quantity = 1): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * quantity * 100))
}

/**
 * Valida la estructura de la imagen y permite únicamente rutas HTTP, HTTPS o relativas.
 * @param value Imagen recibida desde una fuente externa.
 * @returns Indica si contiene una URL admisible y un texto alternativo.
 */
function is_valid_cart_image(value: unknown): value is CartItem["image"] {
  if (!is_record(value) || !is_nonempty_string(value.url) || typeof value.alt !== "string") return false
  try {
    const image_url = new URL(value.url.trim(), "https://cart.invalid/")
    return (image_url.protocol === "https:" || image_url.protocol === "http:") && !image_url.username && !image_url.password
  } catch {
    return false
  }
}

/**
 * Interpreta los datos del carrito y conserva las líneas con una estructura válida.
 * Por cada línea:
 * - Valida los identificadores, la talla, el título, la imagen, la moneda, el precio y la cantidad.
 * - Reconstruye el id a partir del SKU y la talla mediante get_cart_item_id().
 * - Combina las cantidades de los duplicados compatibles sin comprobar todavía el catálogo.
 * Descarta los registros incorrectos sin perder las demás líneas.
 * @param cart_data Datos del carrito que todavía no se han validado.
 * @returns Carrito validado e indicación de posibles registros descartados.
 *   cart: líneas válidas con sus identificadores reconstruidos.
 *   discarded_items: true si se descartó algún registro o los datos no eran un arreglo.
 *   storage_error: false; esta función no accede al almacenamiento del navegador.
 */
export function parse_cart_data(cart_data: unknown): CartStorageSnapshot {
  const storage_snapshot: CartStorageSnapshot = { cart: [], discarded_items: false, storage_error: false }
  if (!Array.isArray(cart_data)) return { ...storage_snapshot, discarded_items: true }
  const items_by_id = new Map<string, CartItem>()

  for (const raw_item of cart_data) {
    if (!is_record(raw_item) || !is_nonempty_string(raw_item.product_id) || !is_nonempty_string(raw_item.sku) ||
      !is_nonempty_string(raw_item.selected_size) || !is_nonempty_string(raw_item.title) || !is_valid_cart_image(raw_item.image) ||
      typeof raw_item.currency !== "string" || !/^[A-Z]{3}$/.test(raw_item.currency) ||
      typeof raw_item.quantity !== "number" || !Number.isSafeInteger(raw_item.quantity) || raw_item.quantity < 1 ||
      !is_valid_price(raw_item.unit_price, raw_item.quantity)) {
      storage_snapshot.discarded_items = true
      continue
    }

    const item: CartItem = {
      id: get_cart_item_id(raw_item.sku.trim(), raw_item.selected_size.trim()),
      product_id: raw_item.product_id.trim(),
      sku: raw_item.sku.trim(),
      selected_size: raw_item.selected_size.trim(),
      title: raw_item.title.trim(),
      image: { url: raw_item.image.url.trim(), alt: raw_item.image.alt },
      currency: raw_item.currency,
      unit_price: raw_item.unit_price,
      quantity: raw_item.quantity,
    }
    const existing_item = items_by_id.get(item.id)
    if (existing_item) {
      const combined_quantity = existing_item.quantity + item.quantity
      if (existing_item.product_id !== item.product_id || existing_item.currency !== item.currency ||
        !Number.isSafeInteger(combined_quantity) || !is_valid_price(existing_item.unit_price, combined_quantity)) {
        storage_snapshot.discarded_items = true
        continue
      }
      items_by_id.set(item.id, { ...existing_item, quantity: combined_quantity })
    } else {
      items_by_id.set(item.id, item)
    }
  }
  storage_snapshot.cart = [...items_by_id.values()]
  return storage_snapshot
}

/**
 * Lee el carrito sin lanzar excepciones si el navegador bloquea el almacenamiento.
 * Mantiene la compatibilidad con el arreglo guardado por versiones anteriores.
 * @returns Datos recuperados e información sobre errores de lectura o registros inválidos.
 *   cart: líneas recuperadas mediante parse_cart_data(); vacío si no se pueden interpretar los datos.
 *   discarded_items: true si el JSON es inválido o contiene registros descartados.
 *   storage_error: true si el navegador impide leer el carrito.
 */
export function get_stored_cart(): CartStorageSnapshot {
  let stored_cart_json: string | null
  try {
    stored_cart_json = window.localStorage.getItem("space-shop-cart")
  } catch {
    return { cart: [], discarded_items: false, storage_error: true }
  }
  if (stored_cart_json === null) return { cart: [], discarded_items: false, storage_error: false }
  try {
    return parse_cart_data(JSON.parse(stored_cart_json))
  } catch {
    return { cart: [], discarded_items: true, storage_error: false }
  }
}

/**
 * Guarda solo las líneas del carrito o elimina la clave si quedó vacío.
 * Permite seguir utilizando el carrito en memoria si la escritura falla.
 * @param cart Líneas que se desean conservar entre visitas.
 * @returns Indica si el navegador aceptó la operación.
 */
export function save_cart(cart: CartItem[]): boolean {
  try {
    if (cart.length === 0) window.localStorage.removeItem("space-shop-cart")
    else window.localStorage.setItem("space-shop-cart", JSON.stringify(cart))
    return true
  } catch {
    return false
  }
}

/**
 * Mantiene una línea pendiente de revisión cuando no se puede consultar su catálogo.
 * @param item Producto que no debe perderse por un fallo de conexión o datos externos.
 * @returns Resultado no confirmado con un mensaje que permite reintentar.
 */
export function get_cart_validation_error(item: CartItem): CartValidationResult {
  return { original_item: item, item, status: "error", limits: null, message: "No pudimos actualizar este producto. Intenta de nuevo." }
}

/**
 * Valida una línea del carrito con los datos actuales del catálogo.
 * Comprueba el SKU, el canal B2C, la imagen, la moneda, el precio y la vigencia del descuento.
 * Calcula los límites de cantidad con las reglas comerciales y el stock disponible.
 * Actualiza los datos del producto sin eliminarlo ni modificar la cantidad seleccionada.
 * @param item Línea elegida por la persona compradora.
 * @param product Variante recién consultada, o undefined si ya no existe.
 * @param available_quantity Stock de la talla comprobado por el servicio de catálogo.
 * @returns Información renovada y estado de compra de la línea.
 *   original_item: referencia de la línea recibida antes de validar.
 *   item: línea con los datos actualizados, o la original si no se pueden comprobar.
 *   status: valid, unavailable, invalid_quantity o error según el resultado.
 *   limits / message: límites de compra y mensaje de revisión cuando corresponde.
 */
export function validate_cart_item(item: CartItem, product: ProductRecord | undefined, available_quantity: number): CartValidationResult {
  if (!product || product.product_id !== item.product_id || product.sku !== item.sku ||
    !Array.isArray(product.sales_channels) || !product.sales_channels.includes("b2c")) {
    return { original_item: item, item, status: "unavailable", limits: null, message: "Este producto ya no está disponible. Puedes quitarlo del carrito." }
  }
  if (!is_nonempty_string(product.title) || !is_valid_cart_image(product.image) ||
    typeof product.currency !== "string" || !/^[A-Z]{3}$/.test(product.currency) ||
    !is_valid_price(product.b2c_price) || typeof product.on_discount !== "boolean") return get_cart_validation_error(item)

  let has_active_discount = product.on_discount
  if (has_active_discount) {
    const discount = product.b2c_discount
    if (!discount || typeof discount.percentage !== "number" || !Number.isFinite(discount.percentage) ||
      discount.percentage < 0 || discount.percentage > 100 || typeof discount.starts_at !== "string" || typeof discount.ends_at !== "string") {
      return get_cart_validation_error(item)
    }
    const discount_start_time = Date.parse(discount.starts_at)
    const discount_end_time = Date.parse(discount.ends_at)
    if (!Number.isFinite(discount_start_time) || !Number.isFinite(discount_end_time) || discount_start_time > discount_end_time) return get_cart_validation_error(item)
    const current_time = Date.now()
    has_active_discount = discount_start_time <= current_time && current_time <= discount_end_time
  }

  const limits = get_cart_quantity_limits(product, available_quantity)
  if (!limits) return get_cart_validation_error(item)
  const updated_item = create_cart_item({ ...product, on_discount: has_active_discount }, item.selected_size, item.quantity)
  if (!is_valid_price(updated_item.unit_price)) return get_cart_validation_error(item)
  const has_same_details = item.id === updated_item.id && item.title === updated_item.title && item.currency === updated_item.currency &&
    item.unit_price === updated_item.unit_price && item.image.url === updated_item.image.url && item.image.alt === updated_item.image.alt
  const current_item = has_same_details ? item : updated_item
  if (limits.max_quantity < limits.min_quantity) {
    return { original_item: item, item: current_item, status: "unavailable", limits, message: "Esta talla ya no está disponible para tu compra. Prueba otra talla o color." }
  }
  if (!is_valid_cart_quantity(item.quantity, limits)) {
    return { original_item: item, item: current_item, status: "invalid_quantity", limits, message: "Ajusta la cantidad o quita el producto para continuar." }
  }
  if (!is_valid_price(updated_item.unit_price, updated_item.quantity)) return get_cart_validation_error(item)
  return { original_item: item, item: current_item, status: "valid", limits }
}

/**
 * Actualiza únicamente líneas que no han cambiado mientras se consultaba el catálogo.
 * @param state Carrito actual, incluidas las modificaciones realizadas durante la consulta.
 * @param validation_results Resultados asociados a las referencias originales consultadas.
 * @returns Carrito con datos renovados sin sobrescribir ediciones más recientes.
 */
export function refresh_cart_items(state: CartItem[], validation_results: CartValidationResult[]): CartItem[] {
  const updates_by_original_item = new Map(validation_results.map((validation_result) => [validation_result.original_item, validation_result.item]))
  let has_changes = false
  const refreshed_cart = state.map((item) => {
    const updated_item = updates_by_original_item.get(item)
    if (updated_item && updated_item !== item) {
      has_changes = true
      return updated_item
    }
    return item
  })
  return has_changes ? refreshed_cart : state
}

/**
 * Combina las reglas B2C con el stock de una talla. El máximo se redondea hacia
 * abajo a una cantidad válida; cero indica que ni siquiera se alcanza el mínimo.
 * Una configuración incompleta o inválida se rechaza, sin asumir valores por defecto.
 * @param product Reglas comerciales B2C del producto.
 * @param available_quantity Unidades disponibles de la talla seleccionada.
 * @returns Límites ajustados al stock y al paso, o null si los datos son inválidos.
 */
export function get_cart_quantity_limits(product: QuantityProduct, available_quantity: number): CartQuantityLimits | null {
  const { b2c_min_order_quantity: min_quantity, b2c_max_order_quantity, b2c_step_quantity: step_quantity } = product
  if (![min_quantity, b2c_max_order_quantity, step_quantity].every((rule_quantity) => Number.isSafeInteger(rule_quantity) && rule_quantity > 0)) return null
  if (b2c_max_order_quantity < min_quantity || !Number.isSafeInteger(available_quantity) || available_quantity < 0) return null

  const quantity_cap = Math.min(b2c_max_order_quantity, available_quantity)
  const max_quantity = quantity_cap < min_quantity ? 0 : min_quantity + Math.floor((quantity_cap - min_quantity) / step_quantity) * step_quantity
  return { min_quantity, max_quantity, step_quantity }
}

/**
 * Comprueba la cantidad final de una línea, incluidos mínimo, máximo y paso.
 * @param quantity Cantidad final que se desea seleccionar.
 * @param limits Límites vigentes de la variante y talla.
 * @returns Indica si la cantidad cumple todas las condiciones de compra.
 */
export function is_valid_cart_quantity(quantity: number, limits: CartQuantityLimits | null): boolean {
  if (!limits || !Number.isSafeInteger(quantity)) return false
  const { min_quantity, max_quantity, step_quantity } = limits
  if (![min_quantity, max_quantity, step_quantity].every(Number.isSafeInteger) || min_quantity < 1 || step_quantity < 1) return false
  return quantity >= min_quantity && quantity <= max_quantity && (quantity - min_quantity) % step_quantity === 0
}

/**
 * Convierte los límites finales en límites para las unidades adicionales.
 * Una línea nueva parte del mínimo; una existente crece en múltiplos del paso.
 * Por ejemplo, con mínimo 2 y paso 3, a una línea de 2 se le añaden 3, 6, ...
 * @param limits Límites de la cantidad final de la variante y talla.
 * @param cart_quantity Unidades de esa variante y talla que ya están en el carrito.
 * @returns Límites para agregar unidades, o null si la selección actual es inválida.
 */
export function get_cart_add_quantity_limits(limits: CartQuantityLimits | null, cart_quantity: number): CartQuantityLimits | null {
  if (!limits || !Number.isSafeInteger(cart_quantity) || cart_quantity < 0) return null
  if (cart_quantity === 0) return limits
  if (!is_valid_cart_quantity(cart_quantity, limits)) return null
  return {
    min_quantity: limits.step_quantity,
    max_quantity: limits.max_quantity - cart_quantity,
    step_quantity: limits.step_quantity,
  }
}

/**
 * Explica por qué una línea no permite agregar más unidades.
 * @param limits Límites vigentes de la variante y talla.
 * @param cart_quantity Unidades de esa variante y talla que ya están en el carrito.
 * @returns Mensaje de disponibilidad, o null si se pueden agregar unidades.
 */
export function get_cart_add_quantity_message(limits: CartQuantityLimits | null, cart_quantity: number): string | null {
  if (!limits) return "No podemos agregar este producto por el momento. Intenta más tarde."
  if (limits.max_quantity < limits.min_quantity) return "No hay suficientes unidades disponibles. Prueba otra talla o color."
  if (cart_quantity > 0 && !is_valid_cart_quantity(cart_quantity, limits)) {
    return "Revisa la cantidad de este producto en el carrito."
  }
  const additional_limits = get_cart_add_quantity_limits(limits, cart_quantity)
  if (!additional_limits || additional_limits.max_quantity < additional_limits.min_quantity) {
    return "Ya tienes en el carrito el máximo permitido para esta compra."
  }
  return null
}

/**
 * Valida el contenido del campo editable de cantidad y sugiere valores permitidos.
 * Distingue un campo vacío de una cantidad igual a cero.
 * @param quantity_input Contenido del campo de cantidad antes de convertirlo a número.
 * @param limits Límites permitidos para la cantidad introducida.
 * @returns Mensaje de ayuda, o null si la cantidad es válida o no hay cantidades disponibles para elegir.
 */
export function get_cart_quantity_input_message(quantity_input: string | number, limits: CartQuantityLimits | null): string | null {
  if (!limits || !is_valid_cart_quantity(limits.min_quantity, limits)) return null
  if (typeof quantity_input === "string" && quantity_input.trim() === "") return "Escribe una cantidad."
  const quantity = Number(quantity_input)
  if (!Number.isFinite(quantity)) return "Escribe una cantidad válida."
  if (is_valid_cart_quantity(quantity, limits)) return null

  const { min_quantity, max_quantity, step_quantity } = limits
  const max_valid_quantity = min_quantity + Math.floor((max_quantity - min_quantity) / step_quantity) * step_quantity
  if (min_quantity === max_valid_quantity) return `Puedes agregar ${min_quantity} ${min_quantity === 1 ? "unidad" : "unidades"}.`
  if (quantity < min_quantity) return `Agrega al menos ${min_quantity} ${min_quantity === 1 ? "unidad" : "unidades"}.`
  if (quantity > max_valid_quantity) return `Puedes agregar hasta ${max_valid_quantity} ${max_valid_quantity === 1 ? "unidad" : "unidades"}.`

  const lower_valid_quantity = min_quantity + Math.floor((quantity - min_quantity) / step_quantity) * step_quantity
  const upper_valid_quantity = Math.min(lower_valid_quantity + step_quantity, max_valid_quantity)
  return `Elige ${lower_valid_quantity} o ${upper_valid_quantity} unidades.`
}

/**
 * Construye el identificador único de una línea del carrito usando la variante y la talla seleccionada.
 * @param sku Identificador de la variante del producto.
 * @param selected_size Talla seleccionada por la persona usuaria.
 * @returns Identificador único para la línea del carrito.
 */
export function get_cart_item_id(sku: string, selected_size: string): string {
  return `${sku}::${selected_size}`
}

/**
 * Obtiene el precio unitario B2C aplicando el descuento vigente cuando existe.
 * @param product Producto que se agregará al carrito.
 * @returns Precio unitario final del producto.
 */
export function get_product_unit_price(product: CartProduct): number {
  if (product.on_discount && product.b2c_discount) {
    return product.b2c_price * (1 - product.b2c_discount.percentage / 100)
  }
  return product.b2c_price
}

/**
 * Calcula el subtotal de una línea del carrito.
 * @param item Producto almacenado en el carrito.
 * @returns Resultado de multiplicar el precio unitario por la cantidad.
 */
export function get_item_subtotal(item: CartItem): number {
  return item.unit_price * item.quantity
}

/**
 * Calcula el subtotal del carrito cuyos productos comparten la misma moneda.
 * @param cart Productos almacenados en el carrito.
 * @returns Suma de los subtotales de las líneas, o cero si el carrito está vacío.
 */
export function get_cart_subtotal(cart: CartItem[]): number {
  return cart.reduce((accumulated_subtotal, item) => accumulated_subtotal + get_item_subtotal(item), 0)
}

/**
 * Calcula el costo de envío según el subtotal del carrito.
 * @param cart Productos almacenados en el carrito.
 * @returns 3.000 colones si el subtotal es menor que 35.000; cero si lo alcanza o el carrito está vacío.
 */
export function get_cart_shipping_cost(cart: CartItem[]): number {
  if (cart.length === 0) {
    return 0
  }
  const subtotal = get_cart_subtotal(cart)
  if (subtotal < 35000) {
    return 3000
  }
  return 0
}

/**
 * Calcula el impuesto del 13 % sobre el subtotal del carrito.
 * @param cart Productos almacenados en el carrito.
 * @returns Monto del impuesto, o cero si el carrito está vacío.
 */
export function get_cart_tax(cart: CartItem[]): number {
  return get_cart_subtotal(cart) * 0.13
}

/**
 * Calcula el total del carrito sumando el subtotal, el impuesto y el costo de envío.
 * @param cart Productos almacenados en el carrito.
 * @returns Total a pagar, o cero si el carrito está vacío.
 */
export function get_cart_total(cart: CartItem[]): number {
  return get_cart_subtotal(cart) + get_cart_tax(cart) + get_cart_shipping_cost(cart)
}

/**
 * Calcula el total de unidades del carrito sumando las cantidades de sus líneas.
 * @param cart Productos almacenados en el carrito.
 * @returns Total de unidades, o cero si el carrito está vacío.
 */
export function get_cart_total_units(cart: CartItem[]): number {
  return cart.reduce((accumulated_units, item) => accumulated_units + item.quantity, 0)
}

/**
 * Divide los productos del carrito en páginas de 5 elementos sin modificar el arreglo original.
 * Cuenta cada combinación SKU+talla como un producto, independientemente de sus unidades.
 * Ajusta la página solicitada cuando se eliminan productos o el valor recibido no es válido.
 * @param cart Productos del carrito completo.
 * @param requested_page Página que se desea mostrar, empezando en 1; por defecto, la primera.
 * @returns Productos de la página y datos de paginación.
 *   page_items: hasta 5 productos de la página seleccionada.
 *   current_page: página seleccionada dentro del rango disponible; 1 si el carrito está vacío.
 *   total_pages: cantidad de páginas; cero si el carrito está vacío.
 *   total_products: cantidad de combinaciones SKU+talla, no la suma de sus unidades.
 */
export function get_cart_pagination(cart: CartItem[], requested_page = 1): CartPagination {
  const items_per_page = 4
  const total_products = cart.length
  const total_pages = Math.ceil(total_products / items_per_page)
  const valid_page = Number.isSafeInteger(requested_page) && requested_page > 0 ? requested_page : 1
  const current_page = Math.min(valid_page, Math.max(total_pages, 1))
  const first_item_index = (current_page - 1) * items_per_page

  return {
    page_items: cart.slice(first_item_index, first_item_index + items_per_page),
    current_page,
    total_pages,
    total_products,
  }
}

/**
 * Obtiene las categorías que se pueden utilizar para sugerir productos del carrito.
 * Elimina espacios externos y duplicados, sin distinguir mayúsculas y minúsculas.
 * Excluye Hombre, Mujer y Unisex como criterios de coincidencia, no los productos que contienen esas categorías.
 * @param category_names Categorías recuperadas desde el catálogo.
 * @returns Categorías sin duplicados y sin las categorías de género excluidas.
 */
export function get_cart_suggestion_categories(category_names: string[]): string[] {
  const excluded_categories = new Set(["hombre", "mujer", "unisex"])
  const categories_by_name = new Map<string, string>()

  for (const category_name of category_names) {
    if (!is_nonempty_string(category_name)) continue
    const trimmed_category = category_name.trim()
    const category_key = trimmed_category.toLocaleLowerCase("es")
    if (!excluded_categories.has(category_key) && !categories_by_name.has(category_key)) {
      categories_by_name.set(category_key, trimmed_category)
    }
  }
  return [...categories_by_name.values()]
}

/**
 * Comprueba que una sugerencia se venda en B2C y tenga una talla con stock suficiente.
 * Suma las unidades de cada talla entre los locales, descontando las reservas.
 * Rechaza inventarios inconsistentes y respeta el mínimo, máximo y paso de compra.
 * @param product Variante candidata a mostrarse como sugerencia.
 * @returns true si al menos una talla permite realizar una compra con sus reglas actuales.
 */
function is_cart_suggestion_available(product: ProductHit): boolean {
  if (!Array.isArray(product.sales_channels) || !product.sales_channels.includes("b2c") ||
    !Array.isArray(product.b2c_stock_by_location)) return false
  const available_by_size = new Map<string, number>()

  for (const location of product.b2c_stock_by_location) {
    if (!location || !is_record(location.sizes)) return false
    for (const [size, size_stock] of Object.entries(location.sizes)) {
      if (!size_stock || !Number.isSafeInteger(size_stock.stock_quantity) || !Number.isSafeInteger(size_stock.reserved_quantity) ||
        size_stock.stock_quantity < 0 || size_stock.reserved_quantity < 0 || size_stock.reserved_quantity > size_stock.stock_quantity) return false
      const available_quantity = size_stock.stock_quantity - size_stock.reserved_quantity
      available_by_size.set(size, (available_by_size.get(size) ?? 0) + available_quantity)
    }
  }

  return [...available_by_size.values()].some((available_quantity) => {
    const limits = get_cart_quantity_limits(product, available_quantity)
    return limits !== null && limits.max_quantity >= limits.min_quantity
  })
}

/**
 * Consulta hasta 4 productos sugeridos a partir de las categorías de todo el carrito.
 * Obtiene las categorías actuales mediante facetas de Algolia, sin guardarlas en localStorage.
 * Por cada consulta de sugerencias:
 * - Busca coincidencias en cualquiera de las categorías permitidas.
 * - Excluye los product_id del carrito y evita repetir colores del mismo producto.
 * - Conserva únicamente variantes B2C con al menos una talla disponible para comprar.
 * Recorre los resultados hasta completar las sugerencias o agotar las coincidencias.
 * No modifica la búsqueda activa del catálogo ni los productos del carrito.
 * @param product_ids Identificadores de todos los productos presentes en el carrito.
 * @returns Hasta 4 variantes sugeridas; un arreglo vacío si no hay categorías permitidas o productos disponibles.
 * @throws Si falla una consulta a Algolia o su respuesta no contiene resultados válidos.
 */
export async function get_cart_suggestions(product_ids: string[]): Promise<ProductHit[]> {
  const cart_product_ids = [...new Set(product_ids.filter(is_nonempty_string).map((product_id) => product_id.trim()))]
  if (cart_product_ids.length === 0) return []

  const cart_product_filters = cart_product_ids.map((product_id) => `product_id:${JSON.stringify(product_id)}`)
  const { data: { results: category_results } } = await search_client.searchWithHTTPInfo<ProductRecord>({
    requests: [{
      indexName: algolia_indices.main,
      query: "",
      filters: cart_product_filters.join(" OR "),
      facets: ["categories"],
      maxValuesPerFacet: 1000,
      hitsPerPage: 0,
      distinct: false,
    }],
  })
  const category_result = category_results[0]
  if (!category_result || !("hits" in category_result) || !Array.isArray(category_result.hits)) throw new Error("Respuesta de categorías inválida.")

  const categories = get_cart_suggestion_categories(Object.keys(category_result.facets?.categories ?? {}))
  if (categories.length === 0) return []
  const category_filters = categories.map((category_name) => `categories:${JSON.stringify(category_name)}`)
  const excluded_product_filters = cart_product_filters.map((product_filter) => `NOT ${product_filter}`)
  const suggestion_filters = `(${category_filters.join(" OR ")}) AND ${excluded_product_filters.join(" AND ")}`
  const matching_categories = new Set(categories.map((category_name) => category_name.toLocaleLowerCase("es")))
  const excluded_product_ids = new Set(cart_product_ids)
  const suggested_product_ids = new Set<string>()
  const suggested_products: ProductHit[] = []
  const suggestion_limit = 4
  let current_page = 0
  let total_pages = 1

  while (current_page < total_pages && suggested_products.length < suggestion_limit) {
    const { data: { results: suggestion_results } } = await search_client.searchWithHTTPInfo<ProductRecord>({
      requests: [{
        indexName: algolia_indices.main,
        query: "",
        filters: suggestion_filters,
        attributesToHighlight: ["title"],
        hitsPerPage: 20,
        page: current_page,
        distinct: false,
      }],
    })
    const suggestion_result = suggestion_results[0]
    if (!suggestion_result || !("hits" in suggestion_result) || !Array.isArray(suggestion_result.hits) || typeof suggestion_result.nbPages !== "number" || !Number.isSafeInteger(suggestion_result.nbPages) || suggestion_result.nbPages < 0) throw new Error("Respuesta de sugerencias inválida.")
    total_pages = suggestion_result.nbPages
    current_page += 1

    for (const product of suggestion_result.hits as ProductHit[]) {
      if (!product || !is_nonempty_string(product.product_id) || !Array.isArray(product.categories) ||
        excluded_product_ids.has(product.product_id) || suggested_product_ids.has(product.product_id)) continue
      const has_matching_category = get_cart_suggestion_categories(product.categories).some((category_name) => matching_categories.has(category_name.toLocaleLowerCase("es")))
      if (!has_matching_category || !is_cart_suggestion_available(product)) continue
      suggested_product_ids.add(product.product_id)
      suggested_products.push(product)
      if (suggested_products.length === suggestion_limit) break
    }
  }
  return suggested_products
}

/**
 * Verifica si una línea puede aumentar un paso con los límites recién consultados.
 * @param item Producto almacenado en el carrito.
 * @param limits Reglas de cantidad y stock vigentes para la línea.
 * @returns true si la cantidad resultante respeta mínimo, máximo y paso.
 */
export function can_increment_item(item: CartItem, limits: CartQuantityLimits | null): boolean {
  return limits !== null && is_valid_cart_quantity(item.quantity + limits.step_quantity, limits)
}

/**
 * Verifica si una línea puede reducir un paso sin bajar del mínimo ni eliminarse.
 * @param item Producto almacenado en el carrito.
 * @param limits Reglas de cantidad y stock vigentes para la línea.
 * @returns Indica si reducir un paso produce una cantidad válida.
 */
export function can_decrement_item(item: CartItem, limits: CartQuantityLimits | null): boolean {
  return limits !== null && is_valid_cart_quantity(item.quantity - limits.step_quantity, limits)
}

/**
 * Crea una línea nueva para el carrito a partir de un producto y la talla seleccionada.
 * @param product Producto que se agregará al carrito.
 * @param selected_size Talla seleccionada por la persona usuaria.
 * @param quantity Cantidad inicial de unidades; por defecto, el mínimo del producto.
 * @returns Producto preparado para almacenarse en el carrito con la cantidad indicada.
 */
export function create_cart_item(product: CartProduct, selected_size: string, quantity = product.b2c_min_order_quantity): CartItem {
  return {
    id: get_cart_item_id(product.sku, selected_size),
    product_id: product.product_id,
    sku: product.sku,
    selected_size: selected_size,
    title: product.title,
    image: product.image,
    unit_price: get_product_unit_price(product),
    currency: product.currency,
    quantity,
  }
}

/**
 * Agrega las unidades solicitadas o las suma a la misma variante y talla si ya existen.
 * Valida la cantidad acumulada de la línea con su mínimo, máximo, paso y stock.
 * @param state Estado actual del carrito.
 * @param new_item Producto y cantidad que se desean agregar.
 * @param limits Límites de cantidad recién consultados para la variante y talla.
 * @returns Estado actualizado sin superar el inventario disponible.
 */
export function add_cart_item(state: CartItem[], new_item: CartItem, limits: CartQuantityLimits): CartItem[] {
  if (!Number.isSafeInteger(new_item.quantity) || new_item.quantity < 1) return state
  const existing_item = state.find((item) => item.id === new_item.id)
  const combined_quantity = (existing_item?.quantity ?? 0) + new_item.quantity
  if (!is_valid_cart_quantity(combined_quantity, limits)) return state
  if (!existing_item) {
    return [...state, new_item]
  }
  return state.map((item) =>
    item.id === existing_item.id ? { ...item, quantity: combined_quantity } : item,
  )
}

/**
 * Actualiza la cantidad de una línea del carrito usando únicamente valores enteros.
 * Rechaza valores que incumplen el mínimo, máximo o paso, sin redondearlos silenciosamente.
 * @param state Estado actual del carrito.
 * @param item_id Identificador de la línea que se actualizará.
 * @param quantity Cantidad entera seleccionada por la persona usuaria.
 * @param limits Límites vigentes de la línea SKU+talla.
 * @returns Estado actualizado del carrito.
 */
export function set_cart_item_quantity(state: CartItem[], item_id: string, quantity: number, limits: CartQuantityLimits): CartItem[] {
  if (!is_valid_cart_quantity(quantity, limits)) return state
  const item = state.find((cart_item) => cart_item.id === item_id)
  if (!item || item.quantity === quantity) return state
  return state.map((cart_item) =>
    cart_item.id === item_id ? { ...cart_item, quantity } : cart_item,
  )
}

/**
 * Incrementa un paso una línea del carrito respetando las reglas y el inventario.
 * @param state Estado actual del carrito.
 * @param item_id Identificador de la línea que se incrementará.
 * @param limits Límites vigentes de la línea SKU+talla.
 * @returns Estado actualizado del carrito.
 */
export function increment_cart_item(state: CartItem[], item_id: string, limits: CartQuantityLimits): CartItem[] {
  const item = state.find((cart_item) => cart_item.id === item_id)
  if (!item || !can_increment_item(item, limits)) return state
  return set_cart_item_quantity(state, item_id, item.quantity + limits.step_quantity, limits)
}

/**
 * Reduce un paso la cantidad de una línea sin permitir cantidades inferiores al mínimo.
 * La eliminación del producto se realiza únicamente mediante remove_cart_item.
 * @param state Estado actual del carrito.
 * @param item_id Identificador de la línea que se reducirá.
 * @param limits Límites vigentes de la línea SKU+talla.
 * @returns Estado actualizado con una cantidad válida o el mismo estado si no se puede reducir.
 */
export function decrement_cart_item(state: CartItem[], item_id: string, limits: CartQuantityLimits): CartItem[] {
  const item = state.find((cart_item) => cart_item.id === item_id)
  if (!item || !can_decrement_item(item, limits)) return state
  return set_cart_item_quantity(state, item_id, item.quantity - limits.step_quantity, limits)
}

/**
 * Elimina por completo una línea del carrito.
 * @param state Estado actual del carrito.
 * @param item_id Identificador de la línea que se eliminará.
 * @returns Estado del carrito sin el producto indicado.
 */
export function remove_cart_item(state: CartItem[], item_id: string): CartItem[] {
  return state.filter((item) => item.id !== item_id)
}

/**
 * Elimina todas las líneas almacenadas en el carrito.
 * @returns Carrito vacío.
 */
export function clear_cart(): CartItem[] {
  return []
}

/**
 * Procesa una acción y delega la actualización del carrito a la función correspondiente.
 * @param state Estado actual del carrito.
 * @param action Acción que se desea aplicar al carrito.
 * @returns Nuevo estado del carrito después de aplicar la acción.
 */
export function cart_reducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add":
      return add_cart_item(state, action.item, action.limits)
    case "set_quantity":
      return set_cart_item_quantity(state, action.item_id, action.quantity, action.limits)
    case "increment":
      return increment_cart_item(state, action.item_id, action.limits)
    case "decrement":
      return decrement_cart_item(state, action.item_id, action.limits)
    case "remove":
      return remove_cart_item(state, action.item_id)
    case "clear":
      return clear_cart()
    case "refresh":
      return refresh_cart_items(state, action.results)
  }
}
