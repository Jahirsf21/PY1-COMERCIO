import type { ProductImage } from "@/lib/catalog/types"
import type { CartItem } from "@/lib/cart/types"
import type { BuyerInfo, CheckoutFormData, DeliveryInfo } from "@/lib/checkout/types"

/**
 * Estados disponibles para un pedido
 */
export type OrderStatus = "PENDING" | "CONFIRMED" | "FAILED"

/**
 * Producto de un pedido con su talla, cantidad, precio y subtotal
 */
export type OrderItem = {
  id: string
  order_id: string
  product_id: string
  sku: string
  selected_size: string
  title: string
  image: ProductImage
  unit_price: number
  quantity: number
  subtotal: number
}

/**
 * Datos del pedido, comprador, entrega y montos de la compra.
 * tax es el monto del IVA y shipping el costo de envío.
 */
export type Order = {
  id: string
  order_number: number
  created_at: string
  buyer: BuyerInfo
  delivery: DeliveryInfo
  currency: string
  subtotal: number
  tax: number
  shipping: number
  total: number
  status: OrderStatus
}

/**
 * Pedido con los productos comprados
 */
export type OrderDetails = Order & {
  items: OrderItem[]
}

/**
 * Resultado de recuperar los pedidos guardados en el navegador
 */
export type OrdersStorageSnapshot = {
  orders: OrderDetails[]
  discarded_orders: boolean
  storage_error: boolean
}

/**
 * Acciones disponibles para modificar los pedidos
 */
export type OrderAction =
  | {
    type: "add"
    order: OrderDetails
  }
  | {
    type: "set_status"
    order_id: string
    status: OrderStatus
  }

/**
 * Estado y operaciones expuestas por el contexto de pedidos
 */
export type OrdersContextValue = {
  orders: OrderDetails[]
  storage_error: boolean
  notice: string | null
  dismiss_notice: () => void
  get_order: (order_id: string) => OrderDetails | undefined
  create_order: (form_data: CheckoutFormData, cart: CartItem[]) => OrderDetails | null
  update_order_status: (order_id: string, status: OrderStatus) => boolean
}
