import type { ProductImage } from "@/lib/catalog/types"
import type { CartItem } from "@/lib/cart/types"
import type { BuyerInfo, CheckoutFormData, DeliveryInfo } from "@/lib/checkout/types"
import type { CardPaymentData, Payment, PaymentResult } from "@/lib/payments/types"

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
 * processed: el sandbox procesó el pago; payment contiene su estado final y message describe el resultado.
 * rejected: el pago no se inició o su respuesta ya no corresponde al pago vigente del pedido.
 */
export type PayOrderResult =
  | {
    status: "processed"
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
  storage_error: boolean
  notice: string | null
  dismiss_notice: () => void
  get_order: (order_id: string) => OrderDetails | undefined
  create_order: (form_data: CheckoutFormData, cart: CartItem[]) => OrderDetails | null
  update_order_status: (order_id: string, status: OrderStatus) => boolean
  pay_order: (order_id: string, card_data: CardPaymentData) => Promise<PayOrderResult>
}
