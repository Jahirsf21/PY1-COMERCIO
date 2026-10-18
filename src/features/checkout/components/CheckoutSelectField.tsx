import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type CheckoutSelectFieldProps = {
  id: string
  name: string
  label: string
  value: string
  options: string[]
  placeholder: string
  error?: string
  disabled?: boolean
  onValueChange: (value: string) => void
}

export function CheckoutSelectField({ id, name, label, value, options, placeholder, error, disabled, onValueChange }: CheckoutSelectFieldProps) {
  return (
    <Field data-invalid={Boolean(error)} data-disabled={disabled}>
      <FieldLabel htmlFor={id}>{`${label} (obligatorio)`}</FieldLabel>
      <Select<string>
        name={name}
        value={value || null}
        items={options.map((option) => ({ value: option, label: option }))}
        disabled={disabled}
        required
        onValueChange={(next_value) => next_value !== null && onValueChange(next_value)}
      >
        <SelectTrigger
          id={id}
          className="h-10 min-h-10 w-full shrink-0 data-[size=default]:h-10"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start" className="overflow-hidden">
          <ScrollArea className="w-full max-h-[min(18rem,var(--available-height))] [&_[data-slot=scroll-area-viewport]]:max-h-[min(18rem,var(--available-height))]">
            {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
          </ScrollArea>
        </SelectContent>
      </Select>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  )
}
