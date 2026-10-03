import type { ProductImage, Discount } from "@/lib/types/product"

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
 * Acciones disponibles para modificar el estado del carrito
 * max_quantity es un límite recién consultado, no un dato persistido del carrito.
 */
export type CartAction =
  | {
    type: "add"
    item: CartItem
    max_quantity: number
  }
  | {
    type: "set_quantity"
    item_id: string
    quantity: number
    max_quantity: number
  }
  | {
    type: "increment"
    item_id: string
    max_quantity: number
  }
  | {
    type: "decrement"
    item_id: string
  }
  | {
    type: "remove"
    item_id: string
  }
  | {
    type: "clear"
  }

/**
 * Estado y operaciones expuestas por el contexto del carrito
 */
export type CartContextValue = {
  cart: CartItem[]
  subtotal: number
  total_items: number
  add_to_cart: (product: CartProduct, selected_size: string, quantity?: number) => Promise<boolean>
  set_quantity: (item_id: string, quantity: number) => Promise<void>
  increment_item: (item_id: string) => Promise<void>
  decrement_item: (item_id: string) => void
  remove_item: (item_id: string) => void
  clear_cart: () => void
}
