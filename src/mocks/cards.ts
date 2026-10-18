import type { MockCard } from "@/lib/payments/types"

/**
 * Tarjetas simuladas con saldos en colones para probar los resultados del pago.
 * - 4111 1111 1111 1111: saldo suficiente para aprobar el pago.
 * - 5555 5555 5555 4444: saldo bajo para rechazar el pago por fondos insuficientes.
 * - 4012 8888 8888 1881: saldo suficiente con error de la pasarela de pago.
 * - 3782 822463 10005: tarjeta American Express con CVV de 4 dígitos y saldo suficiente.
 * - 5105 1051 0510 5100: tarjeta vencida con saldo suficiente.
 */
export const mock_cards: MockCard[] = [
  {
    card_number: "4111111111111111",
    holder_name: "Ana Rodríguez Mora",
    brand: "Visa",
    expiration_date: "12/29",
    cvv: "123",
    balance: 5000000,
    currency: "CRC",
    gateway_status: "AVAILABLE",
  },
  {
    card_number: "5555555555554444",
    holder_name: "Carlos Jiménez Vargas",
    brand: "Mastercard",
    expiration_date: "08/28",
    cvv: "456",
    balance: 15000,
    currency: "CRC",
    gateway_status: "AVAILABLE",
  },
  {
    card_number: "4012888888881881",
    holder_name: "María Fernández Solís",
    brand: "Visa",
    expiration_date: "05/30",
    cvv: "789",
    balance: 1000000,
    currency: "CRC",
    gateway_status: "ERROR",
  },
  {
    card_number: "378282246310005",
    holder_name: "José Ramírez Castro",
    brand: "American Express",
    expiration_date: "03/27",
    cvv: "1234",
    balance: 250000,
    currency: "CRC",
    gateway_status: "AVAILABLE",
  },
  {
    card_number: "5105105105105100",
    holder_name: "Laura Mora Quesada",
    brand: "Mastercard",
    expiration_date: "01/25",
    cvv: "321",
    balance: 300000,
    currency: "CRC",
    gateway_status: "AVAILABLE",
  },
]
