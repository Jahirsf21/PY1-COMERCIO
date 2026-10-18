import type { ProductImage } from "@/lib/catalog/types"
import type { CartItem } from "@/lib/cart/types"
import type { BuyerInfo, CheckoutFormData, DeliveryInfo } from "@/lib/checkout/types"
import type { CardPaymentData, Payment, PaymentResult } from "@/lib/payments/types"

/**
 * Estados disponibles para un pedido
 */
export type OrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED"

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
 * Productos de una página del pedido y datos de su paginación.
 */
export type OrderPagination = {
  page_items: OrderItem[]
  current_page: number
  total_pages: number
  total_products: number
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
 * Pedido con los productos comprados y su pago.
 * payment es null si todavía no existe un intento de pago.
 */
export type OrderDetails = Order & {
  items: OrderItem[]
  payment: Payment | null
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
 * Estado visible y acciones permitidas para consultar un pedido.
 * Un resultado sin guardar no se presenta como compra confirmada ni permite pagar o cancelar.
 */
export type OrderAvailability = {
  status_label: string
  is_confirmed: boolean
  is_processing: boolean
  can_pay: boolean
  can_cancel: boolean
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
    type: "cancel"
    order_id: string
  }
  | {
    type: "start_payment"
    order_id: string
    payment: Payment
  }
  | {
    type: "complete_payment"
    order_id: string
    payment_id: string
    result: PaymentResult
  }

/**
 * Resultado de pagar un pedido.
 * processed: el resultado final del sandbox se guardó correctamente.
 * unsaved: el resultado final permanece en memoria y debe guardarse antes de continuar.
 * rejected: el pago no se inició o su respuesta ya no corresponde al pago vigente del pedido.
 */
export type PayOrderResult =
  | {
    status: "processed" | "unsaved"
    payment: Payment
    message: string
  }
  | {
    status: "rejected"
    message: string
  }

/**
 * Estado y operaciones expuestas por el contexto de pedidos
 */
export type OrdersContextValue = {
  orders: OrderDetails[]
  is_creating_order: boolean
  storage_error: boolean
  notice: string | null
  unsaved_order_ids: string[]
  dismiss_notice: () => void
  retry_save_orders: () => Promise<boolean>
  get_order: (order_id: string) => OrderDetails | undefined
  create_order: (form_data: CheckoutFormData, cart: CartItem[]) => Promise<OrderDetails | null>
  cancel_order: (order_id: string) => Promise<boolean>
  pay_order: (order_id: string, card_data: CardPaymentData) => Promise<PayOrderResult>
}
