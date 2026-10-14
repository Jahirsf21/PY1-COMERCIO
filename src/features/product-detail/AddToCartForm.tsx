import { useId, useState } from "react"
import type { SubmitEvent } from "react"
import { LoaderCircleIcon, MinusIcon, PlusIcon, ShoppingCartIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { get_cart_add_quantity_limits, get_cart_add_quantity_message, get_cart_item_id, get_cart_quantity_input_message, get_cart_quantity_limits, get_product_unit_price, is_valid_cart_quantity } from "@/lib/cart/cart"
import { useCart } from "@/lib/cart/cartContext"
import type { ProductHit } from "@/lib/catalog/types"
import { format_price } from "@/lib/shared/utils"

type AddToCartFormProps = {
  product: ProductHit
  selectedSize: string | null
  availableQuantity: number
  isSubmitting: boolean
  onSubmittingChange: (isSubmitting: boolean) => void
}

/**
 * Permite elegir cuántas unidades de la variante y talla se añadirán desde el detalle.
 * Respeta mínimo, máximo y paso sobre la cantidad acumulada de SKU+talla.
 * @param props Propiedades del componente.
 * @param props.product Variante del producto que se desea agregar.
 * @param props.selectedSize Talla seleccionada, o null si no se ha elegido.
 * @param props.availableQuantity Unidades disponibles de la talla seleccionada.
 * @param props.isSubmitting Indica si se está procesando una adición al carrito.
 * @param props.onSubmittingChange Actualiza el estado de envío.
 * @returns Formulario de cantidad con el subtotal y la acción de agregar al carrito.
 */
export function AddToCartForm({
  product,
  selectedSize,
  availableQuantity,
  isSubmitting,
  onSubmittingChange,
}: AddToCartFormProps) {
  const id = useId()
  const { cart, add_to_cart } = useCart()
  const [quantityInput, setQuantityInput] = useState<{ cartQuantity: number; value: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cartQuantity = selectedSize
    ? cart.find((item) => item.id === get_cart_item_id(product.sku, selectedSize))?.quantity ?? 0
    : 0
  const limits = get_cart_quantity_limits(product, availableQuantity)
  const additionalLimits = get_cart_add_quantity_limits(limits, cartQuantity)
  const minQuantity = additionalLimits?.min_quantity ?? 1
  const maxQuantity = additionalLimits?.max_quantity ?? 0
  const stepQuantity = additionalLimits?.step_quantity ?? 1
  const quantity = quantityInput?.cartQuantity === cartQuantity ? quantityInput.value : String(minQuantity)
  const requestedQuantity = Number(quantity)
  const isValidQuantity = is_valid_cart_quantity(requestedQuantity, additionalLimits)
  const canChooseQuantity = Boolean(selectedSize && additionalLimits && maxQuantity >= minQuantity)
  const canAdd = canChooseQuantity && isValidQuantity && !isSubmitting
  const limitMessage = selectedSize ? get_cart_add_quantity_message(limits, cartQuantity) : null
  const quantityHint = canChooseQuantity && cartQuantity === 0 && limits && limits.min_quantity > 1
    ? `Compra mínima: ${limits.min_quantity} unidades.`
    : null
  const invalidQuantityMessage = canChooseQuantity ? get_cart_quantity_input_message(quantity, additionalLimits) : null
  const quantityDescriptionIds = [
    quantityHint ? `${id}-quantity-hint` : undefined,
    limitMessage ? `${id}-quantity-limit` : undefined,
    invalidQuantityMessage ? `${id}-quantity-invalid` : undefined,
    error ? `${id}-error` : undefined,
  ].filter(Boolean).join(" ") || undefined

  /**
   * Actualiza la cantidad ingresada y descarta el error de la solicitud anterior.
   * @param nextQuantity Nuevo valor del campo de cantidad.
   * @returns No retorna ningún valor.
   */
  function handleQuantityChange(nextQuantity: string): void {
    setQuantityInput({ cartQuantity, value: nextQuantity })
    setError(null)
  }

  /**
   * Agrega toda la cantidad solicitada en una sola acción.
   * Valida nuevamente las reglas de cantidad y el stock antes de confirmar la adición.
   * @param event Evento de envío del formulario.
   * @returns Promesa que finaliza al completar la solicitud.
   */
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!selectedSize || !canAdd) return
    onSubmittingChange(true)
    setError(null)

    try {
      const accepted = await add_to_cart(product, selectedSize, requestedQuantity)
      if (!accepted) {
        setError("Esa cantidad no está disponible. Prueba con otra cantidad o talla.")
        return
      }
      setQuantityInput(null)
      toast.add({
        title: "Producto agregado al carrito",
        description: `${requestedQuantity} ${requestedQuantity === 1 ? "unidad añadida" : "unidades añadidas"} · Talla ${selectedSize}`,
        type: "success",
      })
    } catch {
      setError("No pudimos agregar el producto. Intenta nuevamente.")
    } finally {
      onSubmittingChange(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t border-input pt-5" aria-busy={isSubmitting}>
      <div className="space-y-3">
        <label htmlFor={`${id}-quantity`} className="block font-medium">Cantidad</label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-11 cursor-pointer"
            aria-label="Reducir cantidad"
            disabled={!canChooseQuantity || isSubmitting || !is_valid_cart_quantity(requestedQuantity - stepQuantity, additionalLimits)}
            onClick={() => handleQuantityChange(String(requestedQuantity - stepQuantity))}
          >
            <MinusIcon aria-hidden="true" />
          </Button>
          <Input
            id={`${id}-quantity`}
            name="quantity"
            type="number"
            inputMode="numeric"
            min={minQuantity}
            max={maxQuantity > 0 ? maxQuantity : undefined}
            step={stepQuantity}
            required
            value={quantity}
            disabled={!canChooseQuantity || isSubmitting}
            aria-invalid={canChooseQuantity && !isValidQuantity}
            aria-describedby={quantityDescriptionIds}
            className="h-11 w-20 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            onChange={(event) => handleQuantityChange(event.currentTarget.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-11 cursor-pointer"
            aria-label="Aumentar cantidad"
            disabled={!canChooseQuantity || isSubmitting || !is_valid_cart_quantity(requestedQuantity + stepQuantity, additionalLimits)}
            onClick={() => handleQuantityChange(String(requestedQuantity + stepQuantity))}
          >
            <PlusIcon aria-hidden="true" />
          </Button>
        </div>
        {quantityHint && <p id={`${id}-quantity-hint`} className="text-sm text-muted-foreground">{quantityHint}</p>}
        {limitMessage && <p id={`${id}-quantity-limit`} role="status" className="text-sm text-muted-foreground">{limitMessage}</p>}
        {invalidQuantityMessage && <p id={`${id}-quantity-invalid`} className="text-sm text-destructive">{invalidQuantityMessage}</p>}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">Subtotal</span>
        <span className="font-semibold">
          {isValidQuantity ? format_price(get_product_unit_price(product) * requestedQuantity, product.currency) : "—"}
        </span>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="h-11 w-full cursor-pointer" disabled={!canAdd}>
        {isSubmitting
          ? <LoaderCircleIcon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          : <ShoppingCartIcon aria-hidden="true" />}
        {isSubmitting ? "Agregando…" : "Agregar al carrito"}
      </Button>
    </form>
  )
}
