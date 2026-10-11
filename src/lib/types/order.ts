import type { BuyerInfo, DeliveryInfo } from "@/lib/types/checkout"
import type { ProductImage } from "@/lib/types/product"

/**
 * Estados disponibles para un pedido.
 */
export type OrderStatus = "PENDING" | "CONFIRMED" | "FAILED"

/**
 * Estados disponibles para un pago.
 */
export type PaymentStatus = "PENDING" | "APPROVE" | "DECLINED" | "ERROR"

/**
 * Producto de un pedido con su talla, cantidad y precio.
 * El subtotal se recibe calculado desde el carrito.
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
 * El número del pedido se genera en la base de datos.
 * Los montos se reciben calculados desde el carrito.
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
 * Monto, moneda y estado del pago de un pedido.
 */
export type Payment = {
  id: string
  order_id: string
  created_at: string
  amount: number
  currency: string
  status: PaymentStatus
}

/**
 * Pedido con sus productos y su registro de pago.
 * payment es null si todavía no existe un registro de pago.
 */
export type OrderDetails = Order & {
  items: OrderItem[]
  payment: Payment | null
}
