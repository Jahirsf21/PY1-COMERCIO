import { useEffect, useState } from "react"
import { FieldGroup, FieldSeparator } from "@/components/ui/field"
import { CheckoutBuyerFields } from "@/features/checkout/components/CheckoutBuyerFields"
import { CheckoutDeliveryFields } from "@/features/checkout/components/CheckoutDeliveryFields"
import { get_stored_checkout_form_data, save_checkout_form_data, validate_buyer_fields, validate_delivery_fields } from "@/lib/checkout"
import { get_name_from_hacienda, validate_identification } from "@/lib/identification"
import type { BuyerInfo, DeliveryInfo } from "@/lib/types/checkout"

export function CheckoutForm() {
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
   * Actualiza un campo del comprador y descarta los errores que dejan de corresponder al valor ingresado.
   * Elimina los números del nombre completo al escribir o pegar texto.
   * Conserva únicamente dígitos en los teléfonos y en todos los tipos de identificación.
   * Limita el número de identificación a un máximo de 12 dígitos y los teléfonos a 8.
   * @param field Campo de identificación o contacto que se desea actualizar.
   * @param value Nuevo valor ingresado por la persona compradora.
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
   * Actualiza un campo de entrega y reinicia las ubicaciones que dependen de la selección modificada.
   * Conserva únicamente dígitos en el código postal y limita su longitud a 5.
   * @param field Campo de la dirección de entrega que se desea actualizar.
   * @param value Nuevo valor ingresado o seleccionado por la persona compradora.
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

  return (
    <form
      noValidate
      onSubmit={(event) => event.preventDefault()}
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
