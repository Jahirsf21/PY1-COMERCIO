import type { Order } from "@/lib/orders/types"
import type { CardBrand, CardPaymentData, PaymentResult } from "@/lib/payments/types"
import { validate_text } from "@/lib/identification/identification"
import { mock_cards } from "@/mocks/cards"

/**
 * Elimina los espacios de un número de tarjeta.
 * @param card_number Número de tarjeta ingresado.
 * @returns Número de tarjeta sin espacios.
 */
export function normalize_card_number(card_number: string): string {
  return card_number.replace(/\s/g, "")
}

/**
 * Obtiene la marca de una tarjeta según su prefijo y longitud.
 * - Visa: empieza con 4 y tiene 16 dígitos.
 * - Mastercard: empieza con 51-55 o 22-27 y tiene 16 dígitos.
 * - American Express: empieza con 34 o 37 y tiene 15 dígitos.
 * @param card_number Número de tarjeta.
 * @returns Marca de la tarjeta, o null si no corresponde a ninguna marca disponible.
 */
export function get_card_brand(card_number: string): CardBrand | null {
  const digits = normalize_card_number(card_number)
  if (/^4\d{15}$/.test(digits)) return "Visa"
  if (/^(5[1-5]|2[2-7])\d{14}$/.test(digits)) return "Mastercard"
  if (/^3[47]\d{13}$/.test(digits)) return "American Express"
  return null
}

/**
 * Comprueba el dígito verificador de un número de tarjeta mediante el algoritmo de Luhn.
 * @param card_number Número de tarjeta.
 * @returns true si el número contiene solo dígitos y cumple el algoritmo de Luhn.
 */
export function is_valid_luhn(card_number: string): boolean {
  const digits = normalize_card_number(card_number)
  if (!/^\d+$/.test(digits)) return false
  let checksum = 0
  for (let digit_index = 0; digit_index < digits.length; digit_index += 1) {
    let digit = Number(digits[digits.length - 1 - digit_index])
    if (digit_index % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    checksum += digit
  }
  return checksum % 10 === 0
}

/**
 * Comprueba si una tarjeta está vencida.
 * La tarjeta es válida hasta el último día de su mes de vencimiento.
 * @param expiration_date Fecha de vencimiento con el formato MM/AA.
 * @param current_date Fecha con la que se compara; por defecto, la fecha actual.
 * @returns true si el mes de vencimiento ya terminó.
 */
export function is_card_expired(expiration_date: string, current_date = new Date()): boolean {
  const [month, year] = expiration_date.split("/").map(Number)
  const expiration_year = 2000 + year
  const current_year = current_date.getFullYear()
  const current_month = current_date.getMonth() + 1
  return expiration_year < current_year || (expiration_year === current_year && month < current_month)
}

/**
 * Valida el formato de los datos de la tarjeta.
 * - Número: Visa, Mastercard o American Express con un dígito verificador válido.
 * - Titular: al menos 2 caracteres, solo letras y espacios.
 * - Vencimiento: formato MM/AA con un mes entre 01 y 12.
 * - CVV: 4 dígitos para American Express y 3 para las demás marcas.
 * @param card_data Datos de la tarjeta.
 * @returns Mensaje de error por cada campo inválido; vacío si todos los campos son válidos.
 */
export function validate_card_payment_data(card_data: CardPaymentData): Partial<Record<keyof CardPaymentData, string>> {
  const errors: Partial<Record<keyof CardPaymentData, string>> = {}
  const card_number = normalize_card_number(card_data.card_number)
  const card_brand = get_card_brand(card_number)
  if (!card_number) {
    errors.card_number = "El número de tarjeta es obligatorio."
  } else if (!/^\d+$/.test(card_number)) {
    errors.card_number = "El número de tarjeta solo puede contener dígitos."
  } else if (!card_brand) {
    errors.card_number = "Ingresa una tarjeta Visa, Mastercard o American Express."
  } else if (!is_valid_luhn(card_number)) {
    errors.card_number = "El número de tarjeta no es válido."
  }

  const holder_name = card_data.holder_name.trim()
  if (!holder_name) {
    errors.holder_name = "El nombre del titular es obligatorio."
  } else if (holder_name.length < 2) {
    errors.holder_name = "El nombre del titular debe tener al menos 2 caracteres."
  } else if (!validate_text(holder_name)) {
    errors.holder_name = "El nombre del titular solo puede contener letras y espacios."
  }

  const expiration_date = card_data.expiration_date.trim()
  if (!expiration_date) {
    errors.expiration_date = "La fecha de vencimiento es obligatoria."
  } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiration_date)) {
    errors.expiration_date = "Usa el formato MM/AA con un mes entre 01 y 12."
  }

  const cvv = card_data.cvv.trim()
  const cvv_length = card_brand === "American Express" ? 4 : 3
  if (!cvv) {
    errors.cvv = "El CVV es obligatorio."
  } else if (!new RegExp(`^\\d{${cvv_length}}$`).test(cvv)) {
    errors.cvv = `El CVV debe tener ${cvv_length} dígitos.`
  }
  return errors
}

/**
 * Procesa un pago en el sandbox con las tarjetas simuladas de mock_cards.
 * Después de una demora de 1,5 segundos, evalúa en este orden:
 * - Los datos de la tarjeta mediante validate_card_payment_data().
 * - Que la tarjeta esté registrada en mock_cards.
 * - El estado de la pasarela de pago de la tarjeta.
 * - La fecha de vencimiento, el vencimiento de la tarjeta y el CVV.
 * - La moneda y el saldo disponible frente al total de la orden.
 * @param card_data Datos de la tarjeta.
 * @param order Total y moneda de la orden.
 * @returns Resultado del pago.
 *   status: APPROVE si se aprueba; DECLINED si la tarjeta se rechaza o no tiene fondos suficientes; ERROR si falla la pasarela de pago.
 *   message: descripción breve del resultado.
 */
export async function process_payment(card_data: CardPaymentData, order: Pick<Order, "total" | "currency">): Promise<PaymentResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500))
  if (Object.keys(validate_card_payment_data(card_data)).length > 0) {
    return { status: "DECLINED", message: "Los datos de la tarjeta no son válidos." }
  }
  const card = mock_cards.find((mock_card) => mock_card.card_number === normalize_card_number(card_data.card_number))
  if (!card) return { status: "DECLINED", message: "La tarjeta no está registrada en el sandbox de pagos." }
  if (card.gateway_status === "ERROR") return { status: "ERROR", message: "La pasarela de pago no respondió. Intenta nuevamente." }
  if (card.expiration_date !== card_data.expiration_date.trim()) return { status: "DECLINED", message: "La fecha de vencimiento no coincide con la tarjeta." }
  if (is_card_expired(card.expiration_date)) return { status: "DECLINED", message: "La tarjeta está vencida." }
  if (card.cvv !== card_data.cvv.trim()) return { status: "DECLINED", message: "El CVV es incorrecto." }
  if (card.currency !== order.currency) return { status: "DECLINED", message: `La tarjeta no admite pagos en ${order.currency}.` }
  if (card.balance < order.total) return { status: "DECLINED", message: "Fondos insuficientes para completar el pago." }
  return { status: "APPROVE", message: "Pago aprobado." }
}
