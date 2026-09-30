import type { CartProduct, CartItem, CartAction } from "@/lib/types/cart"

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
 * Verifica si un producto tiene unidades B2C disponibles para agregarse al carrito.
 * @param {CartProduct} product Producto que se desea agregar.
 * @returns {boolean} true si existe al menos una unidad disponible.
 */
export function can_add_product(product: CartProduct): boolean {
  return product.b2c_available_quantity > 0
}

/**
 * Verifica si una línea del carrito puede aumentar una unidad sin superar el inventario disponible.
 * @param {CartItem} item Producto almacenado en el carrito.
 * @returns {boolean} true si la siguiente unidad no supera available_quantity.
 */
export function can_increment_item(item: CartItem): boolean {
  return item.quantity + 1 <= item.available_quantity
}

/**
 * Crea una línea nueva para el carrito a partir de un producto y la talla seleccionada.
 * @param {CartProduct} product Producto que se agregará al carrito.
 * @param {string} selected_size Talla seleccionada por la persona usuaria.
 * @returns {CartItem} Producto preparado para almacenarse en el carrito con cantidad inicial de uno.
 */
export function create_cart_item(product: CartProduct, selected_size: string): CartItem {
  return {
    id: get_cart_item_id(product.sku, selected_size),
    product_id: product.product_id,
    sku: product.sku,
    selected_size: selected_size,
    title: product.title,
    image: product.image,
    unit_price: get_product_unit_price(product),
    currency: product.currency,
    quantity: 1,
    available_quantity: product.b2c_available_quantity,
  }
}

/**
 * Agrega un producto al carrito o incrementa su cantidad cuando la misma variante y talla ya existen.
 * @param {CartItem[]} state Estado actual del carrito.
 * @param {CartItem} new_item Producto que se desea agregar.
 * @returns {CartItem[]} Estado actualizado sin superar el inventario disponible.
 */
export function add_cart_item(state: CartItem[], new_item: CartItem): CartItem[] {
  const existing_item = state.find((item) => item.id === new_item.id)
  if (!existing_item) {
    return new_item.available_quantity > 0 ? [...state, new_item] : state
  }
  return increment_cart_item(state, existing_item.id)
}

/**
 * Actualiza la cantidad de una línea del carrito usando únicamente valores enteros.
 * La cantidad se mantiene entre uno y el inventario disponible.
 * @param {CartItem[]} state Estado actual del carrito.
 * @param {string} item_id Identificador de la línea que se actualizará.
 * @param {number} quantity Cantidad entera seleccionada por la persona usuaria.
 * @returns {CartItem[]} Estado actualizado del carrito.
 */
export function set_cart_item_quantity(state: CartItem[], item_id: string, quantity: number): CartItem[] {
  if (!Number.isInteger(quantity)) return state
  const item = state.find((cart_item) => cart_item.id === item_id)
  if (!item) return state
  const selected_quantity = quantity
  if (item.available_quantity < 1) return state
  if (selected_quantity < 1) {
    return state.map((cart_item) =>
      cart_item.id === item_id ? { ...cart_item, quantity: 1 } : cart_item,
    )
  }
  const valid_quantity = Math.min(selected_quantity, item.available_quantity)
  return state.map((cart_item) =>
    cart_item.id === item_id ? { ...cart_item, quantity: valid_quantity } : cart_item,
  )
}

/**
 * Incrementa en una unidad una línea del carrito cuando existe inventario disponible.
 * @param {CartItem[]} state Estado actual del carrito.
 * @param {string} item_id Identificador de la línea que se incrementará.
 * @returns {CartItem[]} Estado actualizado del carrito.
 */
export function increment_cart_item(state: CartItem[], item_id: string): CartItem[] {
  return state.map((item) => {
    if (item.id !== item_id || !can_increment_item(item)) return item
    return { ...item, quantity: item.quantity + 1 }
  })
}

/**
 * Reduce en una unidad la cantidad de una línea sin permitir cantidades inferiores a uno.
 * La eliminación del producto se realiza únicamente mediante remove_cart_item.
 * @param {CartItem[]} state Estado actual del carrito.
 * @param {string} item_id Identificador de la línea que se reducirá.
 * @returns {CartItem[]} Estado actualizado con una cantidad mínima de uno.
 */
export function decrement_cart_item(state: CartItem[], item_id: string): CartItem[] {
  return state.map((cart_item) =>
    cart_item.id === item_id ? { ...cart_item, quantity: Math.max(1, cart_item.quantity - 1) } : cart_item,
  )
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
      return add_cart_item(state, action.item)
    case "set_quantity":
      return set_cart_item_quantity(state, action.item_id, action.quantity)
    case "increment":
      return increment_cart_item(state, action.item_id)
    case "decrement":
      return decrement_cart_item(state, action.item_id)
    case "remove":
      return remove_cart_item(state, action.item_id)
    case "clear":
      return clear_cart()
  }
}
