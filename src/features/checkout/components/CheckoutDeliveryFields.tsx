import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { CheckoutInputField } from "@/features/checkout/components/CheckoutInputField"
import { CheckoutSelectField } from "@/features/checkout/components/CheckoutSelectField"
import { get_delivery_cantons, get_delivery_districts, get_delivery_provinces } from "@/lib/checkout"
import type { DeliveryInfo } from "@/lib/types/checkout"

type CheckoutDeliveryFieldsProps = {
  delivery: DeliveryInfo
  errors: Partial<Record<keyof DeliveryInfo, string>>
  onChange: (field: keyof DeliveryInfo, value: string) => void
  onBlur: (field: keyof DeliveryInfo) => void
}

const textarea_class = "min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30"

export function CheckoutDeliveryFields({ delivery, errors, onChange, onBlur }: CheckoutDeliveryFieldsProps) {
  return (
    <FieldSet>
      <FieldLegend className="font-semibold">Datos de entrega</FieldLegend>
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <CheckoutInputField
            id="delivery-country"
            name="delivery.country"
            label="País"
            required
            value={delivery.country}
            readOnly
            autoComplete="country-name"
            error={errors.country}
          />
          <CheckoutSelectField
            id="delivery-province"
            name="delivery.province"
            label="Provincia"
            value={delivery.province}
            options={get_delivery_provinces()}
            placeholder="Selecciona una provincia"
            error={errors.province}
            onValueChange={(value) => onChange("province", value)}
          />
          <CheckoutSelectField
            id="delivery-canton"
            name="delivery.canton"
            label="Cantón"
            value={delivery.canton}
            options={get_delivery_cantons(delivery.province)}
            placeholder="Selecciona un cantón"
            disabled={!delivery.province}
            error={errors.canton}
            onValueChange={(value) => onChange("canton", value)}
          />
          <CheckoutSelectField
            id="delivery-district"
            name="delivery.district"
            label="Distrito"
            value={delivery.district}
            options={get_delivery_districts(delivery.province, delivery.canton)}
            placeholder="Selecciona un distrito"
            disabled={!delivery.canton}
            error={errors.district}
            onValueChange={(value) => onChange("district", value)}
          />
        </div>
        <Field data-invalid={Boolean(errors.address)}>
          <FieldLabel htmlFor="delivery-address">Dirección exacta (obligatorio)</FieldLabel>
          <textarea
            id="delivery-address"
            name="delivery.address"
            className={textarea_class}
            required
            rows={3}
            value={delivery.address}
            autoComplete="street-address"
            placeholder="Barrio, calle, número de casa y puntos de referencia"
            aria-invalid={Boolean(errors.address)}
            aria-describedby={errors.address ? "delivery-address-error" : undefined}
            onChange={(event) => onChange("address", event.currentTarget.value)}
            onBlur={() => onBlur("address")}
          />
          <FieldError id="delivery-address-error">{errors.address}</FieldError>
        </Field>
        <div className="sm:max-w-xs">
          <CheckoutInputField
            id="delivery-postal-code"
            name="delivery.postal_code"
            label="Código postal"
            required
            value={delivery.postal_code}
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
            placeholder="Ej. 10101"
            error={errors.postal_code}
            onChange={(event) => onChange("postal_code", event.currentTarget.value)}
            onBlur={() => onBlur("postal_code")}
          />
        </div>
        <Field>
          <FieldLabel htmlFor="delivery-additional-information">Indicaciones adicionales (opcional)</FieldLabel>
          <textarea
            id="delivery-additional-information"
            name="delivery.additional_information"
            className={textarea_class}
            rows={3}
            value={delivery.additional_information}
            placeholder="Indicaciones que faciliten la entrega del pedido"
            aria-describedby="delivery-additional-information-description"
            onChange={(event) => onChange("additional_information", event.currentTarget.value)}
          />
          <FieldDescription id="delivery-additional-information-description">
            Puedes indicar cómo encontrar la entrada o a quién entregar el pedido.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </FieldSet>
  )
}
