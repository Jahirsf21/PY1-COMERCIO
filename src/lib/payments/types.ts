/**
 * Estados disponibles para un pago
 */
export type PaymentStatus = "PENDING" | "APPROVE" | "DECLINED" | "ERROR"

/**
 * Estados simulados de la pasarela de pago
 */
export type GatewayStatus = "AVAILABLE" | "ERROR"

/**
 * Marcas de tarjeta disponibles
 */
export type CardBrand = "Visa" | "Mastercard" | "American Express"

/**
 * Tarjeta simulada con su saldo disponible y el estado de la pasarela de pago.
 * expiration_date tiene el formato MM/AA.
 * gateway_status ERROR simula una falla de la pasarela aunque la tarjeta tenga saldo suficiente.
 */
export type MockCard = {
  card_number: string
  holder_name: string
  brand: CardBrand
  expiration_date: string
  cvv: string
  balance: number
  currency: string
  gateway_status: GatewayStatus
}

/**
 * Datos de la tarjeta ingresados por la persona compradora.
 * expiration_date tiene el formato MM/AA.
 */
export type CardPaymentData = {
  card_number: string
  holder_name: string
  expiration_date: string
  cvv: string
}

/**
 * Monto, moneda y estado del pago de un pedido
 */
export type Payment = {
  id: string
  order_id: string
  created_at: string
  amount: number
  currency: string
  status: PaymentStatus
}
