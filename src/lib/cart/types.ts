import type { ProductImage, Discount } from "@/lib/catalog/types"

/**
 * Información del producto necesaria para agregarlo al carrito
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
 * Producto seleccionado y almacenado dentro del carrito de compras
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
 * Límites vigentes de una línea SKU+talla; max_quantity ya contempla el stock
 * y está alineado a la secuencia min_quantity + n * step_quantity.
 * Estos límites se consultan por separado y no se persisten en el carrito.
 */
export type CartQuantityLimits = {
  min_quantity: number
  max_quantity: number
  step_quantity: number
}

/**
 * Productos de una página del carrito y datos para recorrer sus páginas.
 * Cada combinación SKU+talla cuenta como un producto, sin sumar sus unidades.
 */
export type CartPagination = {
  page_items: CartItem[]
  current_page: number
  total_pages: number
  total_products: number
}

/**
 * Resultado de recuperar el formato histórico del carrito desde el navegador.
 * Los precios recuperados todavía deben comprobarse con el catálogo.
 */
export type CartStorageSnapshot = {
  cart: CartItem[]
  discarded_items: boolean
  storage_error: boolean
}

/**
 * Estado temporal de comprobación de una línea; nunca se guarda en localStorage.
 */
export type CartItemValidation = {
  status: "pending" | "valid" | "unavailable" | "invalid_quantity" | "error"
  limits: CartQuantityLimits | null
  message?: string
}

/**
 * Conserva la referencia consultada para no sobrescribir modificaciones posteriores.
 */
export type CartValidationResult = CartItemValidation & {
  original_item: CartItem
  item: CartItem
}

/**
 * Acciones disponibles para modificar el estado del carrito.
 * Cada cambio de cantidad lleva límites recién consultados.
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
