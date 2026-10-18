import type { ProductImage, Discount, ProductHit } from "@/lib/catalog/types"

/**
 * Datos del producto necesarios para agregarlo al carrito
 */
export type CartProduct = {
  sku: string
  product_id: string
  title: string
  image: ProductImage
  currency: string
  b2c_price: number
  b2c_discount?: Discount
  on_discount: boolean
  b2c_min_order_quantity: number
  b2c_max_order_quantity: number
  b2c_step_quantity: number
}

/**
 * Línea del carrito con el producto, la talla seleccionada y la cantidad
 */
export type CartItem = {
  id: string
  product_id: string
  sku: string
  selected_size: string
  title: string
  image: ProductImage
  unit_price: number
  currency: string
  quantity: number
}

/**
 * Límites de cantidad de una línea SKU+talla.
 * max_quantity contempla el stock y sigue la secuencia min_quantity + n * step_quantity.
 */
export type CartQuantityLimits = {
  min_quantity: number
  max_quantity: number
  step_quantity: number
}

/**
 * Líneas de una página del carrito y datos de paginación
 */
export type CartPagination = {
  page_items: CartItem[]
  current_page: number
  total_pages: number
  total_products: number
}

/**
 * Resultado de consultar las sugerencias del carrito.
 * request_key identifica la consulta que generó el resultado.
 */
export type CartSuggestionsResult = {
  request_key: string
  products: ProductHit[]
  has_error: boolean
}

/**
 * Resultado de recuperar el carrito guardado en el navegador
 */
export type CartStorageSnapshot = {
  cart: CartItem[]
  discarded_items: boolean
  storage_error: boolean
}

/**
 * Estado de validación de una línea del carrito
 */
export type CartItemValidation = {
  status: "pending" | "valid" | "unavailable" | "invalid_quantity" | "error"
  limits: CartQuantityLimits | null
  message?: string
}

/**
 * Resultado de validar una línea del carrito con la línea recibida y la línea actualizada
 */
export type CartValidationResult = CartItemValidation & {
  original_item: CartItem
  item: CartItem
}

/**
 * Acciones disponibles para modificar el carrito
 */
export type CartAction =
  | {
    type: "add"
    item: CartItem
    limits: CartQuantityLimits
  }
  | {
    type: "set_quantity"
    item_id: string
    quantity: number
    limits: CartQuantityLimits
  }
  | {
    type: "increment"
    item_id: string
    limits: CartQuantityLimits
  }
  | {
    type: "decrement"
    item_id: string
    limits: CartQuantityLimits
  }
  | {
    type: "remove"
    item_id: string
  }
  | {
    type: "clear"
  }
  | {
    type: "refresh"
    results: CartValidationResult[]
  }

/**
 * Estado y operaciones expuestas por el contexto del carrito
 */
export type CartContextValue = {
  cart: CartItem[]
  subtotal: number
  shipping: number
  tax: number
  total: number
  total_items: number
  item_validation: Record<string, CartItemValidation>
  is_validating: boolean
  can_checkout: boolean
  storage_error: boolean
  notice: string | null
  revalidate_cart: () => void
  dismiss_notice: () => void
  add_to_cart: (product: CartProduct, selected_size: string, quantity?: number) => Promise<boolean>
  set_quantity: (item_id: string, quantity: number) => Promise<void>
  increment_item: (item_id: string) => Promise<boolean>
  decrement_item: (item_id: string) => Promise<boolean>
  remove_item: (item_id: string) => void
  clear_cart: () => void
}
