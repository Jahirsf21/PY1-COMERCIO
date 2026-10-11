import { useEffect, useRef, useState } from "react"
import type { SubmitEvent } from "react"
import { Button } from "@/components/ui/button"
import { FieldGroup, FieldSeparator } from "@/components/ui/field"
import { CheckoutBuyerFields } from "@/features/checkout/components/CheckoutBuyerFields"
import { CheckoutDeliveryFields } from "@/features/checkout/components/CheckoutDeliveryFields"
import { create_checkout_form_data, validate_buyer_fields, validate_delivery_fields } from "@/lib/checkout"
import { get_name_from_hacienda, validate_identification, validate_identification_type } from "@/lib/identification"
import type { BuyerInfo, CheckoutFormData, DeliveryInfo } from "@/lib/types/checkout"

/**
 * Recupera los datos del formulario almacenados en el navegador.
 * Conserva los campos de texto conocidos, completa los ausentes y aplica los límites de los campos numéricos.
 * @returns {CheckoutFormData} Datos guardados o valores iniciales si el almacenamiento no está disponible o contiene un JSON inválido.
 */
function get_stored_checkout_form_data(): CheckoutFormData {
  const form_data = create_checkout_form_data()
  try {
    const stored_data: { buyer?: Record<string, unknown>; delivery?: Record<string, unknown> } | null = JSON.parse(window.localStorage.getItem("space-shop-checkout") ?? "null")
    for (const section of ["buyer", "delivery"] as const) {
      for (const field of Object.keys(form_data[section])) {
        if (typeof stored_data?.[section]?.[field] === "string") {
          Object.assign(form_data[section], { [field]: stored_data[section][field] })
        }
      }
    }
    if (!validate_identification_type(form_data.buyer.identification_type).valid) {
      form_data.buyer.identification_type = "Nacional"
    }
    form_data.buyer.identification_number = form_data.buyer.identification_number.replace(/\D/g, "").slice(0, 12)
    form_data.buyer.phone_number = form_data.buyer.phone_number.replace(/\D/g, "").slice(0, 8)
    form_data.buyer.alternative_phone_number = (form_data.buyer.alternative_phone_number ?? "").replace(/\D/g, "").slice(0, 8)
    form_data.delivery.country = "Costa Rica"
    form_data.delivery.postal_code = form_data.delivery.postal_code.replace(/\D/g, "").slice(0, 5)
  } catch {
    return form_data
  }
  return form_data
}

/**
 * Agrupa los datos del comprador y la entrega, mostrando los errores junto a cada campo.
 * Completa el nombre para Nacional y Extranjero; permite su ingreso manual para Otro.
 * Recupera los datos guardados y conserva los cambios en localStorage sin un estado adicional.
 */
export function CheckoutForm() {
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
  const isLookupPending = canLookupName && !currentNameResult
  const buyer: BuyerInfo = {
    ...formData.buyer,
    full_name: isManual ? formData.buyer.full_name : currentNameResult?.full_name ?? "",
  }

  useEffect(() => {
    try {
      window.localStorage.setItem("space-shop-checkout", JSON.stringify(formData))
    } catch {
      return
    }
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
   * Conserva únicamente dígitos en los teléfonos y en todos los tipos de identificación.
   * Limita el número de identificación a un máximo de 12 dígitos y los teléfonos a 8.
   * @param field Campo de identificación o contacto que se desea actualizar.
   * @param value Nuevo valor ingresado por la persona compradora.
   */
  function handleBuyerChange<Field extends keyof BuyerInfo>(field: Field, value: BuyerInfo[Field]) {
    if (field === "full_name" && !isManual) return
    const is_numeric = field === "phone_number" || field === "alternative_phone_number" || field === "identification_number"
    const filtered_value = is_numeric && typeof value === "string" ? value.replace(/\D/g, "") : value
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

  /**
   * Valida los datos del formulario sin crear pedidos ni realizar operaciones de pago.
   * Muestra los errores por campo y enfoca el primero que requiere corrección.
   * @param event Evento de envío del formulario de compra.
   */
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isLookupPending) return
    const buyer_errors = validate_buyer_fields(buyer)
    const delivery_errors = validate_delivery_fields(formData.delivery)
    if (!isManual && !buyer.full_name) {
      delete buyer_errors.full_name
      buyer_errors.identification_number ??= lookupError ?? "Completa una identificación válida para obtener el nombre."
    }
    setBuyerErrors(buyer_errors)
    setDeliveryErrors(delivery_errors)
    const has_errors = Object.keys(buyer_errors).length > 0 || Object.keys(delivery_errors).length > 0
    if (has_errors) {
      window.requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)')?.focus()
      })
    }
  }

  return (
    <form
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
      <div className="mt-7 border-t border-input pt-5">
        <Button type="submit" size="lg" className="h-11 w-full cursor-pointer sm:w-auto" disabled={isLookupPending}>
          Continuar
        </Button>
      </div>
    </form>
  )
}
