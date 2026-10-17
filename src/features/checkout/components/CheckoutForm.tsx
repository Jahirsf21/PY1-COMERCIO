import { startTransition, useEffect, useRef, useState } from "react"
import type { SubmitEvent } from "react"
import { useNavigate } from "react-router-dom"
import { FieldGroup, FieldSeparator } from "@/components/ui/field"
import { toast } from "@/components/ui/toast"
import { CheckoutBuyerFields } from "@/features/checkout/components/CheckoutBuyerFields"
import { CheckoutDeliveryFields } from "@/features/checkout/components/CheckoutDeliveryFields"
import { get_stored_checkout_form_data, save_checkout_form_data, validate_buyer_fields, validate_delivery_fields } from "@/lib/checkout/checkout"
import { get_name_from_hacienda, validate_identification } from "@/lib/identification/identification"
import type { BuyerInfo, DeliveryInfo } from "@/lib/checkout/types"
import { useCart } from "@/lib/cart/cartContext"
import { useOrders } from "@/lib/orders/ordersContext"
import { format_price } from "@/lib/shared/utils"

export function CheckoutForm() {
  const { cart, can_checkout, clear_cart } = useCart()
  const { create_order } = useOrders()
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const [formData, setFormData] = useState(get_stored_checkout_form_data)
  const [buyerErrors, setBuyerErrors] = useState<Partial<Record<keyof BuyerInfo, string>>>({})
  const [deliveryErrors, setDeliveryErrors] = useState<Partial<Record<keyof DeliveryInfo, string>>>({})
  const [nameResult, setNameResult] = useState<{ key: string; full_name: string; error?: string } | null>(null)
  const identificationNumber = formData.buyer.identification_number.trim()
  const identificationType = formData.buyer.identification_type
  const isManual = identificationType === "Otro"
  const lookupKey = `${identificationType}:${identificationNumber}`
  const canLookupName = !isManual && validate_identification(identificationNumber, identificationType)
  const currentNameResult = canLookupName && nameResult?.key === lookupKey ? nameResult : null
  const lookupError = currentNameResult?.error
  const buyer: BuyerInfo = {
    ...formData.buyer,
    full_name: isManual ? formData.buyer.full_name : currentNameResult?.full_name ?? "",
  }

  useEffect(() => {
    save_checkout_form_data(formData)
  }, [formData])

  useEffect(() => {
    if (!canLookupName) return
    let active = true
    const timer = window.setTimeout(async () => {
      try {
        const full_name = await get_name_from_hacienda(identificationNumber, identificationType)
        if (!active) return
        setNameResult({
          key: lookupKey,
          full_name: full_name ?? "",
          error: full_name ? undefined : "No se encontró un nombre para esta identificación. Revisa el número ingresado.",
        })
      } catch {
        if (!active) return
        setNameResult({ key: lookupKey, full_name: "", error: "No se pudo completar el nombre. Intenta nuevamente." })
      }
    }, 350)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [canLookupName, identificationNumber, identificationType, lookupKey])

  /**
   * Actualiza un campo del comprador y borra sus errores.
   * Elimina los números del nombre completo, conserva solo los dígitos de la identificación y los teléfonos, y limita la identificación a 12 dígitos y los teléfonos a 8.
   * Al cambiar el tipo de identificación, vacía el nombre completo.
   * @param field Campo del comprador.
   * @param value Valor nuevo.
   * @returns No retorna ningún valor.
   */
  function handleBuyerChange<Field extends keyof BuyerInfo>(field: Field, value: BuyerInfo[Field]) {
    if (field === "full_name" && !isManual) return
    const input_value = field === "full_name" && typeof value === "string" ? value.replace(/\p{N}/gu, "") : value
    const is_numeric = field === "phone_number" || field === "alternative_phone_number" || field === "identification_number"
    const filtered_value = is_numeric && typeof input_value === "string" ? input_value.replace(/\D/g, "") : input_value
    const next_value = is_numeric && typeof filtered_value === "string" ? filtered_value.slice(0, field === "identification_number" ? 12 : 8) : filtered_value
    const changes_identity = field === "identification_type" || field === "identification_number"
    setFormData((previous) => ({
      ...previous,
      buyer: {
        ...previous.buyer,
        [field]: next_value,
        ...(field === "identification_type" ? {
          full_name: "",
          identification_number: previous.buyer.identification_number.replace(/\D/g, "").slice(0, 12),
        } : {}),
      },
    }))
    setBuyerErrors((previous) => ({
      ...previous,
      [field]: undefined,
      ...(changes_identity ? { full_name: undefined, identification_number: undefined } : {}),
    }))
  }

  /**
   * Actualiza un campo de la entrega y vacía las ubicaciones que dependen de él.
   * Conserva solo los dígitos del código postal y limita su longitud a 5.
   * @param field Campo de la entrega.
   * @param value Valor nuevo.
   * @returns No retorna ningún valor.
   */
  function handleDeliveryChange(field: keyof DeliveryInfo, value: string) {
    const next_value = field === "postal_code" ? value.replace(/\D/g, "").slice(0, 5) : value
    const resets = field === "province" ? { canton: "", district: "" } : field === "canton" ? { district: "" } : {}
    setFormData((previous) => ({ ...previous, delivery: { ...previous.delivery, [field]: next_value, ...resets } }))
    setDeliveryErrors((previous) => ({
      ...previous,
      [field]: undefined,
      ...(field === "province" ? { canton: undefined, district: undefined, postal_code: undefined } : {}),
      ...(field === "canton" ? { district: undefined } : {}),
    }))
  }

  function handleBuyerBlur(field: keyof BuyerInfo) {
    setBuyerErrors((previous) => ({ ...previous, [field]: validate_buyer_fields(buyer)[field] }))
  }

  function handleDeliveryBlur(field: keyof DeliveryInfo) {
    setDeliveryErrors((previous) => ({ ...previous, [field]: validate_delivery_fields(formData.delivery)[field] }))
  }

  /**
   * Valida los datos del comprador y la entrega al enviar el formulario.
   * Si hay errores, los muestra y enfoca el primer campo inválido.
   * Espera un nombre válido de Hacienda cuando la identificación requiere consulta.
   * Si los datos son válidos, guarda la orden mediante create_order(), vacía el carrito y abre su vista de pago.
   * Agrupa el vaciado y la navegación para evitar que la protección de checkout redirija antes de abrir el pago.
   * @param event Evento de envío del formulario.
   * @returns No retorna ningún valor.
   */
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!can_checkout) return
    const buyer_errors = validate_buyer_fields(buyer)
    const delivery_errors = validate_delivery_fields(formData.delivery)

    if (!isManual && buyer_errors.full_name) {
      const name_error = buyer_errors.full_name
      delete buyer_errors.full_name
      buyer_errors.identification_number ??= lookupError ?? (
        canLookupName && !currentNameResult
          ? "Espera a que se complete la consulta del nombre antes de continuar."
          : name_error
      )
    }

    setBuyerErrors(buyer_errors)
    setDeliveryErrors(delivery_errors)
    const has_errors = Object.keys(buyer_errors).length > 0 || Object.keys(delivery_errors).length > 0
    if (!has_errors) {
      const order = create_order({ buyer, delivery: formData.delivery }, cart)
      if (!order) {
        toast.add({
          title: "No pudimos generar la orden",
          description: "Revisa los productos y que tu navegador permita guardar datos, e intenta nuevamente.",
          type: "error",
        })
        return
      }
      startTransition(() => {
        clear_cart()
        navigate(`/pedido/${order.id}/pago`)
      })
      toast.add({
        title: `Orden #${order.order_number} generada`,
        description: `Total: ${format_price(order.total, order.currency)}`,
        type: "success",
      })
      return
    }

    window.requestAnimationFrame(() => {
      const invalid_field = formRef.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"]:not(:disabled):not([aria-disabled="true"]):not([readonly]):not([type="hidden"])',
      )
      invalid_field?.focus({ preventScroll: true })
      invalid_field?.scrollIntoView({ block: "center" })
    })
  }

  return (
    <form
      id="checkout-form"
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      aria-labelledby="checkout-form-title"
      className="min-w-0 rounded-xl border border-input bg-card p-5 sm:p-6"
    >
      <h2 id="checkout-form-title" className="text-lg font-semibold">1. Datos del cliente y entrega</h2>
      <FieldGroup className="mt-6 gap-7">
        <CheckoutBuyerFields
          buyer={buyer}
          errors={buyerErrors}
          lookupError={lookupError}
          onChange={handleBuyerChange}
          onBlur={handleBuyerBlur}
        />
        <FieldSeparator />
        <CheckoutDeliveryFields
          delivery={formData.delivery}
          errors={deliveryErrors}
          onChange={handleDeliveryChange}
          onBlur={handleDeliveryBlur}
        />
      </FieldGroup>
    </form>
  )
}
