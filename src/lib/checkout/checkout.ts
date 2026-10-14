import { delivery_locations, delivery_postal_code_ranges } from "@/lib/checkout/delivery_locations"
import {
  validate_email,
  validate_full_name,
  validate_identification_number,
  validate_identification_type,
  validate_phone_number,
} from "@/lib/identification/identification"
import type { BuyerInfo, CheckoutFormData, DeliveryInfo } from "@/lib/checkout/types"

/**
 * Construye los valores iniciales del formulario de compra.
 * Selecciona Nacional como tipo de identificación y Costa Rica como país de entrega.
 * @returns Datos iniciales del formulario.
 *   buyer: información de identificación y contacto, con Nacional seleccionado y los demás campos vacíos.
 *   delivery: dirección de entrega, con Costa Rica seleccionado y los demás campos vacíos.
 */
export function create_checkout_form_data(): CheckoutFormData {
  return {
    buyer: {
      full_name: "",
      identification_type: "Nacional",
      identification_number: "",
      email: "",
      alternative_email: "",
      phone_number: "",
      alternative_phone_number: "",
    },
    delivery: {
      country: "Costa Rica",
      province: "",
      canton: "",
      district: "",
      address: "",
      postal_code: "",
      additional_information: "",
    },
  }
}

/**
 * Recupera explícitamente los campos del comprador y la entrega desde los datos guardados.
 * Conserva los valores iniciales cuando un campo está ausente o tiene un tipo incorrecto.
 * Aplica los límites de identificación, teléfonos y código postal.
 * @param stored_data Datos recuperados del navegador cuyo tipo y estructura todavía no se han comprobado.
 * @returns Información del comprador y la entrega con los campos válidos y los valores iniciales para los demás.
 */
function parse_checkout_form_data(stored_data: unknown): CheckoutFormData {
  const form_data = create_checkout_form_data()
  if (!stored_data || typeof stored_data !== "object" || Array.isArray(stored_data)) return form_data

  if ("buyer" in stored_data && stored_data.buyer && typeof stored_data.buyer === "object" && !Array.isArray(stored_data.buyer)) {
    const buyer = stored_data.buyer
    if ("full_name" in buyer && typeof buyer.full_name === "string") {
      form_data.buyer.full_name = buyer.full_name
    }
    if ("identification_type" in buyer && (
      buyer.identification_type === "Nacional" ||
      buyer.identification_type === "Extranjero" ||
      buyer.identification_type === "Otro"
    )) {
      form_data.buyer.identification_type = buyer.identification_type
    }
    if ("identification_number" in buyer && typeof buyer.identification_number === "string") {
      form_data.buyer.identification_number = buyer.identification_number
    }
    if ("email" in buyer && typeof buyer.email === "string") {
      form_data.buyer.email = buyer.email
    }
    if ("alternative_email" in buyer && typeof buyer.alternative_email === "string") {
      form_data.buyer.alternative_email = buyer.alternative_email
    }
    if ("phone_number" in buyer && typeof buyer.phone_number === "string") {
      form_data.buyer.phone_number = buyer.phone_number
    }
    if ("alternative_phone_number" in buyer && typeof buyer.alternative_phone_number === "string") {
      form_data.buyer.alternative_phone_number = buyer.alternative_phone_number
    }
  }

  if ("delivery" in stored_data && stored_data.delivery && typeof stored_data.delivery === "object" && !Array.isArray(stored_data.delivery)) {
    const delivery = stored_data.delivery
    if ("province" in delivery && typeof delivery.province === "string") {
      form_data.delivery.province = delivery.province
    }
    if ("canton" in delivery && typeof delivery.canton === "string") {
      form_data.delivery.canton = delivery.canton
    }
    if ("district" in delivery && typeof delivery.district === "string") {
      form_data.delivery.district = delivery.district
    }
    if ("address" in delivery && typeof delivery.address === "string") {
      form_data.delivery.address = delivery.address
    }
    if ("postal_code" in delivery && typeof delivery.postal_code === "string") {
      form_data.delivery.postal_code = delivery.postal_code
    }
    if ("additional_information" in delivery && typeof delivery.additional_information === "string") {
      form_data.delivery.additional_information = delivery.additional_information
    }
  }

  form_data.buyer.identification_number = form_data.buyer.identification_number.replace(/\D/g, "").slice(0, 12)
  form_data.buyer.phone_number = form_data.buyer.phone_number.replace(/\D/g, "").slice(0, 8)
  form_data.buyer.alternative_phone_number = (form_data.buyer.alternative_phone_number ?? "").replace(/\D/g, "").slice(0, 8)
  form_data.delivery.country = "Costa Rica"
  form_data.delivery.postal_code = form_data.delivery.postal_code.replace(/\D/g, "").slice(0, 5)
  return form_data
}

/**
 * Recupera los datos del formulario almacenados en el navegador.
 * @returns Datos validados mediante parse_checkout_form_data(), o valores iniciales si el almacenamiento no está disponible o contiene un JSON inválido.
 */
export function get_stored_checkout_form_data(): CheckoutFormData {
  try {
    return parse_checkout_form_data(JSON.parse(window.localStorage.getItem("space-shop-checkout") ?? "null"))
  } catch {
    return create_checkout_form_data()
  }
}

/**
 * Guarda los datos del formulario sin almacenar los errores ni el estado de las consultas.
 * Permite continuar cuando el navegador bloquea el almacenamiento o no tiene espacio disponible.
 * @param form_data Información del comprador y la entrega que se desea conservar.
 * @returns No retorna ningún valor.
 */
export function save_checkout_form_data(form_data: CheckoutFormData): void {
  try {
    window.localStorage.setItem("space-shop-checkout", JSON.stringify(form_data))
  } catch {
    return
  }
}

/**
 * Elimina los datos del formulario guardados en el navegador.
 * Permite continuar si el navegador bloquea el almacenamiento.
 * @returns No retorna ningún valor.
 */
export function clear_stored_checkout_form_data(): void {
  try {
    window.localStorage.removeItem("space-shop-checkout")
  } catch {
    return
  }
}

/**
 * Obtiene las provincias disponibles en el catálogo de entrega.
 * Ordena los nombres alfabéticamente según las reglas del español.
 * @returns Lista de provincias ordenadas alfabéticamente.
 */
export function get_delivery_provinces(): string[] {
  return Object.keys(delivery_locations).sort((first_name, second_name) => first_name.localeCompare(second_name, "es"))
}

/**
 * Obtiene los cantones de una provincia del catálogo de entrega.
 * Comprueba que la provincia exista y ordena los nombres según las reglas del español.
 * @param province Provincia seleccionada por la persona compradora.
 * @returns Lista de cantones ordenados alfabéticamente; un arreglo vacío si la provincia no existe.
 */
export function get_delivery_cantons(province: string): string[] {
  const cantons = Object.hasOwn(delivery_locations, province) ? delivery_locations[province] : {}
  return Object.keys(cantons).sort((first_name, second_name) => first_name.localeCompare(second_name, "es"))
}

/**
 * Obtiene los distritos de un cantón dentro de la provincia seleccionada.
 * Comprueba que el cantón pertenezca a la provincia y ordena una copia de los nombres según las reglas del español.
 * @param province Provincia seleccionada por la persona compradora.
 * @param canton Cantón seleccionado dentro de la provincia.
 * @returns Lista de distritos ordenados alfabéticamente; un arreglo vacío si la provincia o el cantón no existen.
 */
export function get_delivery_districts(province: string, canton: string): string[] {
  if (!get_delivery_cantons(province).includes(canton)) return []
  return [...delivery_locations[province][canton]].sort((first_name, second_name) => first_name.localeCompare(second_name, "es"))
}

/**
 * Valida cada campo de identificación y contacto de la persona compradora.
 * El nombre, el tipo y número de identificación, el correo y el teléfono principales son obligatorios.
 * Los contactos alternativos son opcionales y solo se rechazan cuando contienen un valor inválido.
 * @param buyer Información de la persona compradora que se desea validar.
 * @returns Errores de validación por campo.
 *   Cada propiedad corresponde a un campo inválido de buyer y contiene su mensaje de error.
 *   Los campos válidos no se incluyen; retorna un objeto vacío si todos son válidos.
 */
export function validate_buyer_fields(buyer: BuyerInfo): Partial<Record<keyof BuyerInfo, string>> {
  const field_validations = {
    full_name: validate_full_name(buyer.full_name),
    identification_type: validate_identification_type(buyer.identification_type),
    identification_number: validate_identification_number(buyer.identification_number, buyer.identification_type),
    email: validate_email(buyer.email),
    alternative_email: validate_email(buyer.alternative_email, false, "correo electrónico alternativo"),
    phone_number: validate_phone_number(buyer.phone_number),
    alternative_phone_number: validate_phone_number(buyer.alternative_phone_number, false, "número de teléfono alternativo"),
  }
  const field_errors: Partial<Record<keyof BuyerInfo, string>> = {}
  for (const [field_name, validation_result] of Object.entries(field_validations)) {
    if (!validation_result.valid) field_errors[field_name as keyof BuyerInfo] = validation_result.error
  }
  return field_errors
}

/**
 * Valida el formato de un código postal y el rango de la provincia seleccionada.
 * Exige 5 dígitos, una provincia del 1 al 7 y códigos de cantón y distrito distintos de 00.
 * Comprueba el rango únicamente cuando la provincia existe en el catálogo de rangos.
 * No verifica la correspondencia con un cantón o distrito concreto porque el catálogo de ubicaciones no incluye sus códigos.
 * @param postal_code Código postal ingresado por la persona compradora.
 * @param province Provincia seleccionada para la entrega.
 * @returns Resultado de la validación.
 *   valid: true si el código cumple el formato y el rango de la provincia cuando está disponible.
 *   error: primer requisito incumplido, cuando valid es false.
 */
export function validate_delivery_postal_code(postal_code: string, province: string): { valid: boolean; error?: string } {
  const trimmed_postal_code = postal_code.trim()
  if (!trimmed_postal_code) {
    return { valid: false, error: "El código postal es obligatorio." }
  }
  if (!/^\d{5}$/.test(trimmed_postal_code)) {
    return { valid: false, error: "El código postal debe contener exactamente 5 dígitos." }
  }
  if (!/^[1-7]/.test(trimmed_postal_code)) {
    return { valid: false, error: "El primer dígito del código postal debe identificar una provincia del 1 al 7." }
  }
  if (trimmed_postal_code.slice(1, 3) === "00" || trimmed_postal_code.slice(3, 5) === "00") {
    return { valid: false, error: "Los códigos de cantón y distrito del código postal no pueden ser 00." }
  }
  if (Object.hasOwn(delivery_postal_code_ranges, province)) {
    const province_postal_range = delivery_postal_code_ranges[province]
    const numeric_postal_code = Number(trimmed_postal_code)
    if (numeric_postal_code < province_postal_range.minimum || numeric_postal_code > province_postal_range.maximum) {
      return { valid: false, error: `El código postal para ${province} debe estar entre ${province_postal_range.minimum} y ${province_postal_range.maximum}.` }
    }
  }
  return { valid: true }
}

/**
 * Valida la dirección de entrega y la relación entre provincia, cantón y distrito.
 * Admite únicamente Costa Rica y ubicaciones presentes en el catálogo de entrega.
 * Requiere una dirección y un código postal de 5 dígitos dentro del rango de la provincia; las indicaciones adicionales son opcionales.
 * @param delivery Dirección de entrega que se desea validar.
 * @returns Errores de validación por campo.
 *   Cada propiedad corresponde a un campo inválido de delivery y contiene su mensaje de error.
 *   Los campos válidos no se incluyen; retorna un objeto vacío si todos son válidos.
 */
export function validate_delivery_fields(delivery: DeliveryInfo): Partial<Record<keyof DeliveryInfo, string>> {
  const errors: Partial<Record<keyof DeliveryInfo, string>> = {}
  if (delivery.country !== "Costa Rica") errors.country = "Las entregas se realizan únicamente en Costa Rica."
  if (!delivery.province) {
    errors.province = "La provincia de entrega es obligatoria."
  } else if (!get_delivery_provinces().includes(delivery.province)) {
    errors.province = "Selecciona una provincia del catálogo de entrega."
  }
  if (!delivery.canton) {
    errors.canton = "El cantón de entrega es obligatorio."
  } else if (!get_delivery_cantons(delivery.province).includes(delivery.canton)) {
    errors.canton = "El cantón debe pertenecer a la provincia seleccionada."
  }
  if (!delivery.district) {
    errors.district = "El distrito de entrega es obligatorio."
  } else if (!get_delivery_districts(delivery.province, delivery.canton).includes(delivery.district)) {
    errors.district = "El distrito debe pertenecer al cantón seleccionado."
  }
  if (!delivery.address.trim()) errors.address = "La dirección exacta de entrega es obligatoria."
  const postal_code_result = validate_delivery_postal_code(delivery.postal_code, delivery.province)
  if (!postal_code_result.valid) errors.postal_code = postal_code_result.error
  return errors
}
