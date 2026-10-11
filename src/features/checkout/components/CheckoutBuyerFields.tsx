import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field"
import { CheckoutInputField } from "@/features/checkout/components/CheckoutInputField"
import { CheckoutSelectField } from "@/features/checkout/components/CheckoutSelectField"
import type { BuyerInfo, IdentificationType } from "@/lib/types/checkout"

type CheckoutBuyerFieldsProps = {
  buyer: BuyerInfo
  errors: Partial<Record<keyof BuyerInfo, string>>
  lookupError?: string
  onChange: <Field extends keyof BuyerInfo>(field: Field, value: BuyerInfo[Field]) => void
  onBlur: (field: keyof BuyerInfo) => void
}

/**
 * Muestra los campos de identificación y contacto de la persona compradora.
 * Permite editar el nombre únicamente cuando el tipo de identificación seleccionado es Otro.
 */
export function CheckoutBuyerFields({ buyer, errors, lookupError, onChange, onBlur }: CheckoutBuyerFieldsProps) {
  const is_manual = buyer.identification_type === "Otro"
  return (
    <FieldSet>
      <FieldLegend className="font-semibold">Información del cliente</FieldLegend>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <CheckoutSelectField
            id="buyer-identification-type"
            name="buyer.identification_type"
            label="Tipo de identificación"
            value={buyer.identification_type}
            options={["Nacional", "Extranjero", "Otro"]}
            placeholder="Selecciona el tipo de identificación"
            error={errors.identification_type}
            onValueChange={(value) => onChange("identification_type", value as IdentificationType)}
          />
          <CheckoutInputField
            id="buyer-identification-number"
            name="buyer.identification_number"
            label="Número de identificación"
            required
            value={buyer.identification_number}
            inputMode="numeric"
            maxLength={12}
            autoComplete="off"
            placeholder={is_manual ? "Número del documento" : buyer.identification_type === "Nacional" ? "Ej. 101230456" : "Ej. 12345678901"}
            error={lookupError ?? errors.identification_number}
            onChange={(event) => onChange("identification_number", event.currentTarget.value)}
            onBlur={() => onBlur("identification_number")}
          />
        </div>
        <CheckoutInputField
          id="buyer-full-name"
          name="buyer.full_name"
          label="Nombre completo"
          required
          value={buyer.full_name}
          readOnly={!is_manual}
          autoComplete={is_manual ? "name" : "off"}
          placeholder="Nombre completo"
          error={errors.full_name}
          onChange={(event) => is_manual && onChange("full_name", event.currentTarget.value)}
          onBlur={() => is_manual && onBlur("full_name")}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <CheckoutInputField
            id="buyer-email"
            name="buyer.email"
            label="Correo electrónico"
            type="email"
            required
            value={buyer.email}
            autoComplete="email"
            placeholder="nombre@dominio.com"
            error={errors.email}
            onChange={(event) => onChange("email", event.currentTarget.value)}
            onBlur={() => onBlur("email")}
          />
          <CheckoutInputField
            id="buyer-alternative-email"
            name="buyer.alternative_email"
            label="Correo alternativo (opcional)"
            type="email"
            value={buyer.alternative_email ?? ""}
            autoComplete="off"
            placeholder="otro@dominio.com"
            error={errors.alternative_email}
            onChange={(event) => onChange("alternative_email", event.currentTarget.value)}
            onBlur={() => onBlur("alternative_email")}
          />
          <CheckoutInputField
            id="buyer-phone-number"
            name="buyer.phone_number"
            label="Número de teléfono"
            type="tel"
            inputMode="numeric"
            maxLength={8}
            required
            value={buyer.phone_number}
            autoComplete="tel-national"
            placeholder="Ej. 87654321"
            error={errors.phone_number}
            onChange={(event) => onChange("phone_number", event.currentTarget.value)}
            onBlur={() => onBlur("phone_number")}
          />
          <CheckoutInputField
            id="buyer-alternative-phone-number"
            name="buyer.alternative_phone_number"
            label="Teléfono alternativo (opcional)"
            type="tel"
            inputMode="numeric"
            maxLength={8}
            value={buyer.alternative_phone_number ?? ""}
            autoComplete="off"
            placeholder="Ej. 12345678"
            error={errors.alternative_phone_number}
            onChange={(event) => onChange("alternative_phone_number", event.currentTarget.value)}
            onBlur={() => onBlur("alternative_phone_number")}
          />
        </div>
      </FieldGroup>
    </FieldSet>
  )
}
