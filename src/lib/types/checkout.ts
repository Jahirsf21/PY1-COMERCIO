/**
 * Tipos de identificación disponibles para la persona compradora: nacional o extranjero
 */
export type IdentificationType = "Nacional" | "Extranjero" | "Otro";

/**
 * Información de identificación y contacto de la persona compradora
 */
export type BuyerInfo = {
    full_name: string
    identification_type: IdentificationType
    identification_number: string
    email: string
    alternative_email?: string
    phone_number: string
    alternative_phone_number?: string
}

/**
 * Dirección de entrega del pedido
 */
export type DeliveryInfo = {
    country: string
    province: string
    canton: string
    district: string
    address: string
    postal_code: string
    additional_information: string
}

/**
 * Datos del formulario de compra que agrupan la información del comprador y la entrega
 */
export type CheckoutFormData = {
    buyer: BuyerInfo
    delivery: DeliveryInfo
}
