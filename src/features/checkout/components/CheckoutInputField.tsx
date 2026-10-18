import type { ComponentProps } from "react"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/shared/utils"

type CheckoutInputFieldProps = ComponentProps<"input"> & {
  id: string
  label: string
  error?: string
}

export function CheckoutInputField({ id, label, error, className, required, ...props }: CheckoutInputFieldProps) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>
        {`${label}${required ? " (obligatorio)" : ""}`}
      </FieldLabel>
      <Input
        {...props}
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn("h-10 min-h-10 read-only:bg-muted", className)}
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  )
}
