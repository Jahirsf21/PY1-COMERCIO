import { useRef, useState } from "react"
import type { SubmitEvent } from "react"
import { CreditCardIcon, LoaderCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { CheckoutInputField } from "@/features/checkout/components/CheckoutInputField"
import { get_order_payment_block } from "@/lib/orders/orders"
import { useOrders } from "@/lib/orders/ordersContext"
import type { OrderDetails, PayOrderResult } from "@/lib/orders/types"
import { get_card_brand, validate_card_payment_data } from "@/lib/payments/payments"
import type { CardPaymentData } from "@/lib/payments/types"
import { format_price } from "@/lib/shared/utils"
import amex_logo from "@/assets/cards/amex.svg"
import mastercard_logo from "@/assets/cards/mastercard.svg"
import visa_logo from "@/assets/cards/visa.svg"

const accepted_cards = [
  { name: "Visa", src: visa_logo },
  { name: "Mastercard", src: mastercard_logo },
  { name: "American Express", src: amex_logo },
]

type PaymentFormProps = {
  order: OrderDetails
  on_result: (result: PayOrderResult) => void
  on_error: () => void
}

/**
 * Permite pagar una orden guardada mediante pay_order(), manteniendo la tarjeta solo en memoria.
 * Reutiliza los campos del checkout para mostrar las etiquetas y los errores de la tarjeta.
 * Mantiene las validaciones de campos y comunica los resultados para mostrarlos fuera del formulario.
 * @param props Propiedades del formulario.
 * @param props.order Orden pendiente que se desea pagar.
 * @param props.on_result Acción que recibe el resultado del pago.
 * @param props.on_error Acción que informa un error inesperado.
 * @returns Formulario de tarjeta bloqueado mientras se procesa el pago.
 */
export function PaymentForm({ order, on_result, on_error }: PaymentFormProps) {
  const { pay_order } = useOrders()
  const form_ref = useRef<HTMLFormElement>(null)
  const submitting = useRef(false)
  const [card_data, set_card_data] = useState<CardPaymentData>({
    card_number: "",
    holder_name: "",
    expiration_date: "",
    cvv: "",
  })
  const [errors, set_errors] = useState<Partial<Record<keyof CardPaymentData, string>>>({})
  const [is_submitting, set_is_submitting] = useState(false)
  const is_processing = is_submitting || order.payment?.status === "PENDING"
  const card_brand = get_card_brand(card_data.card_number)

  /**
   * Actualiza un dato de la tarjeta y limpia el error de ese campo.
   * Al cambiar el número, limpia también el error del CVV porque su longitud depende de la marca.
   * Inserta el separador del vencimiento para permitir su ingreso desde un teclado numérico.
   * @param field Campo de la tarjeta que cambia.
   * @param value Valor ingresado.
   * @returns No retorna ningún valor.
   */
  function change_card_field(field: keyof CardPaymentData, value: string): void {
    let next_value = value
    if (field === "expiration_date") {
      const digits = value.replace(/\D/g, "").slice(0, 4)
      next_value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
    }
    set_card_data((previous) => ({ ...previous, [field]: next_value }))
    set_errors((previous) => ({
      ...previous,
      [field]: undefined,
      ...(field === "card_number" ? { cvv: undefined } : {}),
    }))
  }

  /**
   * Valida un campo al salir de él usando las reglas del servicio de pagos.
   * @param field Campo que pierde el foco.
   * @returns No retorna ningún valor.
   */
  function validate_card_field(field: keyof CardPaymentData): void {
    set_errors((previous) => ({ ...previous, [field]: validate_card_payment_data(card_data)[field] }))
  }

  /**
   * Valida el formulario y paga la misma orden mediante OrdersContext.
   * Impide envíos repetidos, muestra el resultado y limpia el CVV después del intento.
   * @param event Evento de envío del formulario.
   * @returns Promesa que termina al recibir el resultado del pago.
   */
  async function submit_payment(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (submitting.current || get_order_payment_block(order)) return
    const validation_errors = validate_card_payment_data(card_data)
    set_errors(validation_errors)
    if (Object.keys(validation_errors).length > 0) {
      window.requestAnimationFrame(() => {
        form_ref.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()
      })
      return
    }

    submitting.current = true
    set_is_submitting(true)
    try {
      const result = await pay_order(order.id, { ...card_data })
      on_result(result)
    } catch {
      on_error()
    } finally {
      set_card_data((previous) => ({ ...previous, cvv: "" }))
      submitting.current = false
      set_is_submitting(false)
    }
  }

  return (
    <section aria-labelledby="payment-form-title" className="min-w-0 rounded-xl border border-input bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCardIcon aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 id="payment-form-title" className="text-lg font-semibold">Datos de pago</h2>
        </div>
        <ul aria-label="Tarjetas aceptadas" className="flex items-center gap-1.5">
          {accepted_cards.map((card) => (
            <li key={card.name}>
              <img src={card.src} alt={card.name} width={38} height={24} className="h-6 w-auto rounded-sm" />
            </li>
          ))}
        </ul>
      </div>
      <p id="payment-form-description" className="mt-2 text-sm text-muted-foreground">
        Todas las transacciones son seguras y están encriptadas.
      </p>
      <form ref={form_ref} noValidate onSubmit={submit_payment} aria-describedby="payment-form-description" aria-busy={is_processing} className="mt-6">
        <fieldset disabled={is_processing} className="min-w-0">
          <legend className="sr-only">Tarjeta de pago</legend>
          <FieldGroup>
            <CheckoutInputField
              id="payment-card-number"
              name="card_number"
              label="Número de tarjeta"
              required
              inputMode="numeric"
              autoComplete="cc-number"
              maxLength={23}
              placeholder="0000 0000 0000 0000"
              value={card_data.card_number}
              error={errors.card_number}
              onChange={(event) => change_card_field("card_number", event.currentTarget.value)}
              onBlur={() => validate_card_field("card_number")}
            />
            <CheckoutInputField
              id="payment-card-holder"
              name="holder_name"
              label="Nombre del titular"
              required
              autoComplete="cc-name"
              placeholder="Como aparece en la tarjeta"
              value={card_data.holder_name}
              error={errors.holder_name}
              onChange={(event) => change_card_field("holder_name", event.currentTarget.value)}
              onBlur={() => validate_card_field("holder_name")}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <CheckoutInputField
                id="payment-card-expiration"
                name="expiration_date"
                label="Vencimiento"
                required
                inputMode="numeric"
                autoComplete="cc-exp"
                maxLength={5}
                placeholder="MM/AA"
                value={card_data.expiration_date}
                error={errors.expiration_date}
                onChange={(event) => change_card_field("expiration_date", event.currentTarget.value)}
                onBlur={() => validate_card_field("expiration_date")}
              />
              <CheckoutInputField
                id="payment-card-cvv"
                name="cvv"
                label={card_brand === "American Express" ? "CVV (4 dígitos)" : "CVV (3 dígitos)"}
                required
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={4}
                value={card_data.cvv}
                error={errors.cvv}
                onChange={(event) => change_card_field("cvv", event.currentTarget.value)}
                onBlur={() => validate_card_field("cvv")}
              />
            </div>
          </FieldGroup>
        </fieldset>
        <Button type="submit" disabled={is_processing} size="lg" className="mt-6 h-11 w-full cursor-pointer">
          {is_processing && <LoaderCircleIcon aria-hidden="true" className="size-4 motion-safe:animate-spin" />}
          {is_processing ? "Procesando pago…" : `${order.payment ? "Reintentar pago" : "Pagar"} ${format_price(order.total, order.currency)}`}
        </Button>
      </form>
    </section>
  )
}
