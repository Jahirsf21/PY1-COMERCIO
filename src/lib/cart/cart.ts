import type { CartProduct, CartItem, CartAction, CartQuantityLimits, CartStorageSnapshot, CartValidationResult, CartPagination } from "@/lib/cart/types"
import type { ProductHit, ProductRecord } from "@/lib/catalog/types"
import { algolia_indices, search_client } from "@/lib/algolia/algolia"
import { get_suggestions } from "@/lib/shared/suggestions"
import { get_product_quantity_limits, get_stored_json, is_nonempty_string, is_positive_integer, is_record, is_valid_currency, is_valid_image, is_valid_price, save_stored_list } from "@/lib/shared/utils"

type QuantityProduct = Pick<CartProduct, "b2c_min_order_quantity" | "b2c_max_order_quantity" | "b2c_step_quantity">

/**
 * Valida los datos del carrito y conserva las líneas con una estructura válida.
 * Por cada línea:
 * - Valida los identificadores, la talla, el título, la imagen, la moneda, el precio y la cantidad.
 * - Reconstruye el id a partir del SKU y la talla mediante get_cart_item_id().
 * - Suma las cantidades de las líneas repetidas que tienen el mismo producto y moneda.
 * @param cart_data Datos del carrito sin validar.
 * @returns Carrito validado.
 *   cart: líneas válidas.
 *   discarded_items: true si se descartó alguna línea o los datos no son un arreglo.
 *   storage_error: siempre false.
 */
export function parse_cart_data(cart_data: unknown): CartStorageSnapshot {
  const storage_snapshot: CartStorageSnapshot = { cart: [], discarded_items: false, storage_error: false }
  if (!Array.isArray(cart_data)) return { ...storage_snapshot, discarded_items: true }
  const items_by_id = new Map<string, CartItem>()

  for (const raw_item of cart_data) {
    if (!is_record(raw_item) || !is_nonempty_string(raw_item.product_id) || !is_nonempty_string(raw_item.sku) ||
      !is_nonempty_string(raw_item.selected_size) || !is_nonempty_string(raw_item.title) || !is_valid_image(raw_item.image) ||
      !is_valid_currency(raw_item.currency) || !is_positive_integer(raw_item.quantity) ||
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
 * Obtiene el carrito guardado en localStorage y lo valida mediante parse_cart_data().
 * @returns Carrito recuperado.
 *   cart: líneas válidas; vacío si la clave no existe o no se puede leer.
 *   discarded_items: true si el JSON es inválido o contiene líneas descartadas.
 *   storage_error: true si el navegador impide leer localStorage.
 */
export function get_stored_cart(): CartStorageSnapshot {
  const stored_cart = get_stored_json("space-shop-cart")
  if (stored_cart.status === "ok") return parse_cart_data(stored_cart.data)
  return { cart: [], discarded_items: stored_cart.status === "invalid_json", storage_error: stored_cart.status === "storage_error" }
}

/**
 * Guarda las líneas del carrito en localStorage, o elimina la clave si el carrito está vacío.
 * @param cart Líneas del carrito.
 * @returns true si se guardó; false si el navegador rechaza la operación.
 */
export function save_cart(cart: CartItem[]): boolean {
  return save_stored_list("space-shop-cart", cart)
}

/**
 * Crea un resultado de validación con estado error para una línea del carrito.
 * @param item Línea del carrito.
 * @returns Resultado con estado error, sin límites y con un mensaje para reintentar.
 */
export function get_cart_validation_error(item: CartItem): CartValidationResult {
  return { original_item: item, item, status: "error", limits: null, message: "No pudimos actualizar este producto. Intenta de nuevo." }
}

/**
 * Valida una línea del carrito con los datos actuales del catálogo.
 * - Comprueba el producto, el SKU, el canal B2C, el título, la imagen, la moneda, el precio y la vigencia del descuento.
 * - Calcula los límites de cantidad con las reglas B2C y el stock disponible.
 * - Actualiza el título, la imagen, la moneda y el precio de la línea, conservando la cantidad.
 * @param item Línea del carrito.
 * @param product Variante consultada en el catálogo, o undefined si no existe.
 * @param available_quantity Stock disponible de la talla seleccionada.
 * @returns Resultado de la validación.
 *   original_item: línea recibida.
 *   item: línea con los datos actualizados, o la recibida si no cambió o no se pudo validar.
 *   status: valid, unavailable, invalid_quantity o error.
 *   limits: límites de cantidad, o null si no se pudieron calcular.
 *   message: mensaje para la persona compradora cuando status no es valid.
 */
export function validate_cart_item(item: CartItem, product: ProductRecord | undefined, available_quantity: number): CartValidationResult {
  if (!product || product.product_id !== item.product_id || product.sku !== item.sku ||
    !Array.isArray(product.sales_channels) || !product.sales_channels.includes("b2c")) {
    return { original_item: item, item, status: "unavailable", limits: null, message: "Este producto ya no está disponible. Puedes quitarlo del carrito." }
  }
  if (!is_nonempty_string(product.title) || !is_valid_image(product.image) || !is_valid_currency(product.currency) ||
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
 * Reemplaza las líneas del carrito por sus versiones validadas.
 * Solo reemplaza las líneas que siguen siendo la misma referencia que original_item.
 * @param state Estado actual del carrito.
 * @param validation_results Resultados de validación de las líneas.
 * @returns Carrito actualizado, o el mismo estado si no hay cambios.
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
 * Calcula los límites de cantidad de una línea mediante get_product_quantity_limits().
 * @param product Reglas de cantidad B2C del producto.
 * @param available_quantity Stock disponible de la talla seleccionada.
 * @returns Límites de cantidad, o null si las reglas o el stock son inválidos.
 */
export function get_cart_quantity_limits(product: QuantityProduct, available_quantity: number): CartQuantityLimits | null {
  return get_product_quantity_limits(product, available_quantity)
}

/**
 * Comprueba que una cantidad cumpla el mínimo, el máximo y el paso de una línea.
 * @param quantity Cantidad que se desea comprobar.
 * @param limits Límites de cantidad de la línea.
 * @returns true si la cantidad es válida; false si no lo es o no hay límites.
 */
export function is_valid_cart_quantity(quantity: number, limits: CartQuantityLimits | null): boolean {
  if (!limits || !Number.isSafeInteger(quantity)) return false
  const { min_quantity, max_quantity, step_quantity } = limits
  if (![min_quantity, max_quantity, step_quantity].every(Number.isSafeInteger) || min_quantity < 1 || step_quantity < 1) return false
  return quantity >= min_quantity && quantity <= max_quantity && (quantity - min_quantity) % step_quantity === 0
}

/**
 * Calcula los límites de las unidades que se pueden agregar a una línea.
 * Si la línea no está en el carrito retorna los mismos límites; si está, el mínimo es un paso y el máximo es lo que falta para el límite.
 * Por ejemplo, con mínimo 2 y paso 3, a una línea de 2 unidades se le pueden agregar 3, 6, ...
 * @param limits Límites de cantidad de la línea.
 * @param cart_quantity Unidades de la línea que ya están en el carrito.
 * @returns Límites para agregar unidades, o null si no hay límites o la cantidad actual es inválida.
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
 * Obtiene el mensaje que explica por qué no se pueden agregar más unidades a una línea.
 * @param limits Límites de cantidad de la línea.
 * @param cart_quantity Unidades de la línea que ya están en el carrito.
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
 * Valida el valor del campo de cantidad y obtiene un mensaje con las cantidades permitidas.
 * @param quantity_input Valor del campo de cantidad.
 * @param limits Límites de cantidad de la línea.
 * @returns Mensaje de ayuda, o null si la cantidad es válida o no hay cantidades disponibles.
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
 * Construye el identificador de una línea del carrito a partir del SKU y la talla.
 * @param sku SKU de la variante.
 * @param selected_size Talla seleccionada.
 * @returns Identificador con el formato sku::talla.
 */
export function get_cart_item_id(sku: string, selected_size: string): string {
  return `${sku}::${selected_size}`
}

/**
 * Calcula el precio unitario B2C de un producto aplicando su descuento si está activo.
 * @param product Producto que se agregará al carrito.
 * @returns Precio unitario con el descuento aplicado, o b2c_price si no tiene descuento.
 */
export function get_product_unit_price(product: CartProduct): number {
  if (product.on_discount && product.b2c_discount) {
    return product.b2c_price * (1 - product.b2c_discount.percentage / 100)
  }
  return product.b2c_price
}

/**
 * Calcula el subtotal de una línea del carrito.
 * @param item Línea del carrito.
 * @returns Precio unitario multiplicado por la cantidad.
 */
export function get_item_subtotal(item: CartItem): number {
  return item.unit_price * item.quantity
}

/**
 * Calcula el subtotal del carrito sumando los subtotales de sus líneas.
 * @param cart Líneas del carrito.
 * @returns Subtotal del carrito, o cero si está vacío.
 */
export function get_cart_subtotal(cart: CartItem[]): number {
  return cart.reduce((accumulated_subtotal, item) => accumulated_subtotal + get_item_subtotal(item), 0)
}

/**
 * Calcula el costo de envío según el subtotal del carrito.
 * @param cart Líneas del carrito.
 * @returns 3000 si el subtotal es menor que 35000; cero si lo alcanza o el carrito está vacío.
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
 * @param cart Líneas del carrito.
 * @returns Monto del impuesto, o cero si el carrito está vacío.
 */
export function get_cart_tax(cart: CartItem[]): number {
  return get_cart_subtotal(cart) * 0.13
}

/**
 * Calcula el total del carrito sumando el subtotal, el impuesto y el costo de envío.
 * @param cart Líneas del carrito.
 * @returns Total a pagar, o cero si el carrito está vacío.
 */
export function get_cart_total(cart: CartItem[]): number {
  return get_cart_subtotal(cart) + get_cart_tax(cart) + get_cart_shipping_cost(cart)
}

/**
 * Calcula el total de unidades del carrito sumando las cantidades de sus líneas.
 * @param cart Líneas del carrito.
 * @returns Total de unidades, o cero si el carrito está vacío.
 */
export function get_cart_total_units(cart: CartItem[]): number {
  return cart.reduce((accumulated_units, item) => accumulated_units + item.quantity, 0)
}

/**
 * Divide las líneas del carrito en páginas de 4 elementos.
 * Ajusta la página solicitada al rango disponible y usa la primera si el valor es inválido.
 * @param cart Líneas del carrito.
 * @param requested_page Página solicitada, empezando en 1; por defecto, 1.
 * @returns Líneas de la página y datos de paginación.
 *   page_items: hasta 4 líneas de la página seleccionada.
 *   current_page: página seleccionada; 1 si el carrito está vacío.
 *   total_pages: cantidad de páginas; cero si el carrito está vacío.
 *   total_products: cantidad de líneas SKU+talla.
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
 * Consulta hasta 20 productos sugeridos según las categorías de los productos del carrito.
 * Obtiene las categorías mediante facetas de Algolia y busca las sugerencias con get_suggestions().
 * @param product_ids Identificadores de los productos del carrito.
 * @returns Hasta 20 variantes sugeridas; vacío si no hay productos, categorías o sugerencias disponibles.
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

  const categories = Object.keys(category_result.facets?.categories ?? {})
  return get_suggestions(categories, cart_product_ids)
}

/**
 * Comprueba si la cantidad de una línea puede aumentar un paso.
 * @param item Línea del carrito.
 * @param limits Límites de cantidad de la línea.
 * @returns true si la cantidad aumentada es válida.
 */
export function can_increment_item(item: CartItem, limits: CartQuantityLimits | null): boolean {
  return limits !== null && is_valid_cart_quantity(item.quantity + limits.step_quantity, limits)
}

/**
 * Comprueba si la cantidad de una línea puede reducirse un paso.
 * @param item Línea del carrito.
 * @param limits Límites de cantidad de la línea.
 * @returns true si la cantidad reducida es válida.
 */
export function can_decrement_item(item: CartItem, limits: CartQuantityLimits | null): boolean {
  return limits !== null && is_valid_cart_quantity(item.quantity - limits.step_quantity, limits)
}

/**
 * Crea una línea del carrito a partir de un producto y la talla seleccionada.
 * @param product Producto que se agregará al carrito.
 * @param selected_size Talla seleccionada.
 * @param quantity Cantidad de unidades; por defecto, el mínimo B2C del producto.
 * @returns Línea del carrito con el precio unitario calculado mediante get_product_unit_price().
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
 * Agrega una línea al carrito, o suma sus unidades si ya existe una línea con el mismo SKU y talla.
 * @param state Estado actual del carrito.
 * @param new_item Línea que se desea agregar.
 * @param limits Límites de cantidad de la línea.
 * @returns Carrito actualizado, o el mismo estado si la cantidad resultante es inválida.
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
 * Actualiza la cantidad de una línea del carrito.
 * @param state Estado actual del carrito.
 * @param item_id Identificador de la línea.
 * @param quantity Cantidad nueva.
 * @param limits Límites de cantidad de la línea.
 * @returns Carrito actualizado, o el mismo estado si la cantidad es inválida, no cambia o la línea no existe.
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
 * Aumenta un paso la cantidad de una línea del carrito.
 * @param state Estado actual del carrito.
 * @param item_id Identificador de la línea.
 * @param limits Límites de cantidad de la línea.
 * @returns Carrito actualizado, o el mismo estado si la línea no existe o la cantidad resultante es inválida.
 */
export function increment_cart_item(state: CartItem[], item_id: string, limits: CartQuantityLimits): CartItem[] {
  const item = state.find((cart_item) => cart_item.id === item_id)
  if (!item || !can_increment_item(item, limits)) return state
  return set_cart_item_quantity(state, item_id, item.quantity + limits.step_quantity, limits)
}

/**
 * Reduce un paso la cantidad de una línea del carrito.
 * @param state Estado actual del carrito.
 * @param item_id Identificador de la línea.
 * @param limits Límites de cantidad de la línea.
 * @returns Carrito actualizado, o el mismo estado si la línea no existe o la cantidad resultante es inválida.
 */
export function decrement_cart_item(state: CartItem[], item_id: string, limits: CartQuantityLimits): CartItem[] {
  const item = state.find((cart_item) => cart_item.id === item_id)
  if (!item || !can_decrement_item(item, limits)) return state
  return set_cart_item_quantity(state, item_id, item.quantity - limits.step_quantity, limits)
}

/**
 * Elimina una línea del carrito.
 * @param state Estado actual del carrito.
 * @param item_id Identificador de la línea.
 * @returns Carrito sin la línea indicada.
 */
export function remove_cart_item(state: CartItem[], item_id: string): CartItem[] {
  return state.filter((item) => item.id !== item_id)
}

/**
 * Vacía el carrito.
 * @returns Arreglo vacío.
 */
export function clear_cart(): CartItem[] {
  return []
}

/**
 * Aplica una acción al carrito mediante la función correspondiente.
 * @param state Estado actual del carrito.
 * @param action Acción que se desea aplicar.
 * @returns Estado del carrito después de aplicar la acción.
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
