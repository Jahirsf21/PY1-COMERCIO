import type { CartProduct, CartItem, CartAction, CartQuantityLimits } from "@/lib/cart/types"

type QuantityProduct = Pick<CartProduct, "b2c_min_order_quantity" | "b2c_max_order_quantity" | "b2c_step_quantity">

/**
 * Combina las reglas B2C con el stock de una talla. El máximo se redondea hacia
 * abajo a una cantidad válida; cero indica que ni siquiera se alcanza el mínimo.
 * Una configuración incompleta o inválida se rechaza, sin asumir valores por defecto.
 */
export function get_cart_quantity_limits(product: QuantityProduct, available_quantity: number): CartQuantityLimits | null {
  const { b2c_min_order_quantity: min_quantity, b2c_max_order_quantity, b2c_step_quantity: step_quantity } = product
  if (![min_quantity, b2c_max_order_quantity, step_quantity].every((value) => Number.isSafeInteger(value) && value > 0)) return null
  if (b2c_max_order_quantity < min_quantity || !Number.isSafeInteger(available_quantity) || available_quantity < 0) return null

  const cap = Math.min(b2c_max_order_quantity, available_quantity)
  const max_quantity = cap < min_quantity ? 0 : min_quantity + Math.floor((cap - min_quantity) / step_quantity) * step_quantity
  return { min_quantity, max_quantity, step_quantity }
}

/** Comprueba la cantidad final de una línea, incluidos mínimo, máximo y paso. */
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

/** Explica por qué una línea no permite agregar más unidades. */
export function get_cart_add_quantity_message(limits: CartQuantityLimits | null, cart_quantity: number): string | null {
  if (!limits) return "No podemos agregar este producto por el momento. Intenta más tarde."
  if (limits.max_quantity < limits.min_quantity) return "No hay suficientes unidades disponibles. Prueba otra talla o color."
  if (cart_quantity > 0 && !is_valid_cart_quantity(cart_quantity, limits)) {
    return "Quita este producto del carrito y vuelve a agregarlo."
  }
  const additional_limits = get_cart_add_quantity_limits(limits, cart_quantity)
  if (!additional_limits || additional_limits.max_quantity < additional_limits.min_quantity) {
    return "Ya tienes en el carrito el máximo permitido para esta compra."
  }
  return null
}

/** Sugiere cantidades seleccionables sin exponer al comprador las reglas internas. */
export function get_cart_quantity_input_message(quantity: number, limits: CartQuantityLimits | null): string | null {
  if (!limits || !is_valid_cart_quantity(limits.min_quantity, limits)) return "Esta cantidad no está disponible."
  if (is_valid_cart_quantity(quantity, limits)) return null
  if (!Number.isFinite(quantity)) return "Escribe una cantidad."

  const { min_quantity, max_quantity, step_quantity } = limits
  const maximum = min_quantity + Math.floor((max_quantity - min_quantity) / step_quantity) * step_quantity
  if (min_quantity === maximum) return `Puedes agregar ${min_quantity} ${min_quantity === 1 ? "unidad" : "unidades"}.`
  if (quantity < min_quantity) return `Agrega al menos ${min_quantity} ${min_quantity === 1 ? "unidad" : "unidades"}.`
  if (quantity > maximum) return `Puedes agregar hasta ${maximum} ${maximum === 1 ? "unidad" : "unidades"}.`

  const lower = min_quantity + Math.floor((quantity - min_quantity) / step_quantity) * step_quantity
  const upper = Math.min(lower + step_quantity, maximum)
  return `Elige ${lower} o ${upper} unidades.`
}

/**
 * Construye el identificador único de una línea del carrito usando la variante y la talla seleccionada.
 * @param {string} sku Identificador de la variante del producto.
 * @param {string} selected_size Talla seleccionada por la persona usuaria.
 * @returns {string} Identificador único para la línea del carrito.
 */
export function get_cart_item_id(sku: string, selected_size: string): string {
  return `${sku}::${selected_size}`
}

/**
 * Obtiene el precio unitario B2C aplicando el descuento vigente cuando existe.
 * @param {CartProduct} product Producto que se agregará al carrito.
 * @returns {number} Precio unitario final del producto.
 */
export function get_product_unit_price(product: CartProduct): number {
  if (product.on_discount && product.b2c_discount) {
    return product.b2c_price * (1 - product.b2c_discount.percentage / 100)
  }
  return product.b2c_price
}

/**
 * Calcula el subtotal de una línea del carrito.
 * @param {CartItem} item Producto almacenado en el carrito.
 * @returns {number} Resultado de multiplicar el precio unitario por la cantidad.
 */
export function get_item_subtotal(item: CartItem): number {
  return item.unit_price * item.quantity
}

/**
 * Calcula el subtotal del carrito cuyos productos comparten la misma moneda.
 * @param {CartItem[]} cart Productos almacenados en el carrito.
 * @returns {number} Suma de los subtotales de las líneas, o cero si el carrito está vacío.
 */
export function get_cart_subtotal(cart: CartItem[]): number {
  return cart.reduce((total, item) => total + get_item_subtotal(item), 0)
}

/**
 * Calcula el costo de envío según el subtotal del carrito.
 * @param {CartItem[]} cart Productos almacenados en el carrito.
 * @returns {number} 3.000 colones si el subtotal es menor que 35.000; cero si lo alcanza o el carrito está vacío.
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
 * @param {CartItem[]} cart Productos almacenados en el carrito.
 * @returns {number} Monto del impuesto, o cero si el carrito está vacío.
 */
export function get_cart_tax(cart: CartItem[]): number {
  return get_cart_subtotal(cart) * 0.13
}

/**
 * Calcula el total del carrito sumando el subtotal, el impuesto y el costo de envío.
 * @param {CartItem[]} cart Productos almacenados en el carrito.
 * @returns {number} Total a pagar, o cero si el carrito está vacío.
 */
export function get_cart_total(cart: CartItem[]): number {
  return get_cart_subtotal(cart) + get_cart_tax(cart) + get_cart_shipping_cost(cart)
}

/**
 * Calcula el total de unidades del carrito sumando las cantidades de sus líneas.
 * @param {CartItem[]} cart Productos almacenados en el carrito.
 * @returns {number} Total de unidades, o cero si el carrito está vacío.
 */
export function get_cart_total_units(cart: CartItem[]): number {
  return cart.reduce((total, item) => total + item.quantity, 0)
}

/**
 * Verifica si una línea puede aumentar un paso con los límites recién consultados.
 * @param {CartItem} item Producto almacenado en el carrito.
 * @param limits Reglas de cantidad y stock vigentes para la línea.
 * @returns true si la cantidad resultante respeta mínimo, máximo y paso.
 */
export function can_increment_item(item: CartItem, limits: CartQuantityLimits | null): boolean {
  return limits !== null && is_valid_cart_quantity(item.quantity + limits.step_quantity, limits)
}

/** Verifica si una línea puede reducir un paso sin bajar del mínimo ni eliminarse. */
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
  const quantity = (existing_item?.quantity ?? 0) + new_item.quantity
  if (!is_valid_cart_quantity(quantity, limits)) return state
  if (!existing_item) {
    return [...state, new_item]
  }
  return state.map((item) =>
    item.id === existing_item.id ? { ...item, quantity } : item,
  )
}

/**
 * Actualiza la cantidad de una línea del carrito usando únicamente valores enteros.
 * Rechaza valores que incumplen el mínimo, máximo o paso, sin redondearlos silenciosamente.
 * @param {CartItem[]} state Estado actual del carrito.
 * @param {string} item_id Identificador de la línea que se actualizará.
 * @param {number} quantity Cantidad entera seleccionada por la persona usuaria.
 * @param limits Límites vigentes de la línea SKU+talla.
 * @returns {CartItem[]} Estado actualizado del carrito.
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
 * @param {CartItem[]} state Estado actual del carrito.
 * @param {string} item_id Identificador de la línea que se incrementará.
 * @param limits Límites vigentes de la línea SKU+talla.
 * @returns {CartItem[]} Estado actualizado del carrito.
 */
export function increment_cart_item(state: CartItem[], item_id: string, limits: CartQuantityLimits): CartItem[] {
  const item = state.find((cart_item) => cart_item.id === item_id)
  if (!item || !can_increment_item(item, limits)) return state
  return set_cart_item_quantity(state, item_id, item.quantity + limits.step_quantity, limits)
}

/**
 * Reduce un paso la cantidad de una línea sin permitir cantidades inferiores al mínimo.
 * La eliminación del producto se realiza únicamente mediante remove_cart_item.
 * @param {CartItem[]} state Estado actual del carrito.
 * @param {string} item_id Identificador de la línea que se reducirá.
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
 * @param {CartItem[]} state Estado actual del carrito.
 * @param {string} item_id Identificador de la línea que se eliminará.
 * @returns {CartItem[]} Estado del carrito sin el producto indicado.
 */
export function remove_cart_item(state: CartItem[], item_id: string): CartItem[] {
  return state.filter((item) => item.id !== item_id)
}

/**
 * Elimina todas las líneas almacenadas en el carrito.
 * @returns {CartItem[]} Carrito vacío.
 */
export function clear_cart(): CartItem[] {
  return []
}

/**
 * Procesa una acción y delega la actualización del carrito a la función correspondiente.
 * @param {CartItem[]} state Estado actual del carrito.
 * @param {CartAction} action Acción que se desea aplicar al carrito.
 * @returns {CartItem[]} Nuevo estado del carrito después de aplicar la acción.
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
  }
}
