import { useId, useState } from "react"
import { LoaderCircleIcon, MinusIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/context/useCart"
import type { CartItem } from "@/lib/types/cart"

type CartQuantityStepperProps = {
  item: CartItem
}

/**
 * Permite aumentar o reducir las unidades de una línea del carrito.
 * La cantidad mínima es uno: el botón de reducir se deshabilita en ese valor y la línea
 * solo se elimina con su botón "Eliminar", igual que en el detalle del producto.
 */
export function CartQuantityStepper({ item }: CartQuantityStepperProps) {
  const id = useId()
  const { increment_item, decrement_item } = useCart()
  const [isIncrementing, setIsIncrementing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  /**
   * Solicita una unidad más y avisa si el stock actual no lo permite.
   */
  async function handleIncrement() {
    setIsIncrementing(true)
    setMessage(null)
    try {
      const accepted = await increment_item(item.id)
      if (!accepted) setMessage("No hay más unidades disponibles de esta talla.")
    } catch {
      setMessage("No pudimos actualizar la cantidad. Intenta nuevamente.")
    } finally {
      setIsIncrementing(false)
    }
  }

  function handleDecrement() {
    setMessage(null)
    decrement_item(item.id)
  }

  return (
    <div>
      <div
        role="group"
        aria-label={`Cantidad de ${item.title}`}
        aria-describedby={message ? `${id}-message` : undefined}
        className="inline-flex items-center rounded-lg border border-input bg-background"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 cursor-pointer rounded-r-none"
          aria-label={`Reducir cantidad de ${item.title}`}
          disabled={item.quantity <= 1 || isIncrementing}
          onClick={handleDecrement}
        >
          <MinusIcon aria-hidden="true" />
        </Button>
        <span
          aria-live="polite"
          aria-atomic="true"
          className="min-w-10 border-x border-input px-2 text-center text-sm font-medium tabular-nums"
        >
          <span className="sr-only">Cantidad: </span>
          {item.quantity}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 cursor-pointer rounded-l-none"
          aria-label={`Aumentar cantidad de ${item.title}`}
          aria-busy={isIncrementing}
          disabled={isIncrementing}
          onClick={handleIncrement}
        >
          {isIncrementing
            ? <LoaderCircleIcon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            : <PlusIcon aria-hidden="true" />}
        </Button>
      </div>
      {message && (
        <p id={`${id}-message`} role="status" className="mt-2 text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  )
}
