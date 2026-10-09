import { useId, useState } from "react"
import type { SubmitEvent } from "react"
import { LoaderCircleIcon, MinusIcon, PlusIcon, ShoppingCartIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { get_cart_item_id, get_product_unit_price } from "@/lib/cart"
import { useCart } from "@/lib/context/useCart"
import type { ProductHit } from "@/lib/types/product"
import { format_price } from "@/lib/utils"

type AddToCartFormProps = {
  product: ProductHit
  selectedSize: string | null
  availableQuantity: number
  isSubmitting: boolean
  onSubmittingChange: (isSubmitting: boolean) => void
}

/**
 * Permite elegir cuántas unidades de la variante y talla se añadirán desde el detalle.
 * Descuenta las unidades del carrito del stock disponible y muestra el subtotal a agregar.
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
  const [quantity, setQuantity] = useState("1")
  const [error, setError] = useState<string | null>(null)
  const cartQuantity = selectedSize
    ? cart.find((item) => item.id === get_cart_item_id(product.sku, selectedSize))?.quantity ?? 0
    : 0
  const maxQuantity = Math.max(0, availableQuantity - cartQuantity)
  const requestedQuantity = Number(quantity)
  const isValidQuantity = Number.isInteger(requestedQuantity) && requestedQuantity >= 1 && requestedQuantity <= maxQuantity
  const canChooseQuantity = Boolean(selectedSize && maxQuantity > 0)
  const canAdd = canChooseQuantity && isValidQuantity && !isSubmitting
  const stockLimitReached = Boolean(selectedSize && availableQuantity > 0 && cartQuantity >= availableQuantity)
  const quantityDescriptionIds = [
    stockLimitReached ? `${id}-stock-limit` : undefined,
    error ? `${id}-error` : undefined,
  ].filter(Boolean).join(" ") || undefined

  function handleQuantityChange(nextQuantity: string) {
    setQuantity(nextQuantity)
    setError(null)
  }

  /**
   * Agrega toda la cantidad solicitada en una sola acción, validando nuevamente el stock.
   * @param event Evento de envío del formulario.
   */
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSize || !canAdd) return
    onSubmittingChange(true)
    setError(null)

    try {
      const accepted = await add_to_cart(product, selectedSize, requestedQuantity)
      if (!accepted) {
        setError("No hay suficientes unidades disponibles para esta cantidad. Reduce la cantidad o prueba otra talla o color.")
        return
      }
      setQuantity("1")
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
            disabled={!canChooseQuantity || isSubmitting || !Number.isInteger(requestedQuantity) || requestedQuantity <= 1}
            onClick={() => handleQuantityChange(String(requestedQuantity - 1))}
          >
            <MinusIcon aria-hidden="true" />
          </Button>
          <Input
            id={`${id}-quantity`}
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={maxQuantity > 0 ? maxQuantity : undefined}
            step={1}
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
            disabled={!canChooseQuantity || isSubmitting || !Number.isInteger(requestedQuantity) || requestedQuantity >= maxQuantity}
            onClick={() => handleQuantityChange(String(Math.max(1, requestedQuantity + 1)))}
          >
            <PlusIcon aria-hidden="true" />
          </Button>
        </div>
        {stockLimitReached && (
          <p id={`${id}-stock-limit`} role="status" className="text-sm text-muted-foreground">
            {`No puedes añadir más al carrito — tenemos ${availableQuantity} ${availableQuantity === 1 ? "unidad disponible" : "unidades disponibles"} y ya has añadido ${cartQuantity} ${cartQuantity === 1 ? "unidad" : "unidades"} a tu carrito.`}
          </p>
        )}
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
