import { useId, useState } from "react"
import { LoaderCircleIcon, MinusIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { can_decrement_item, can_increment_item, get_cart_add_quantity_message } from "@/lib/cart/cart"
import { useCart } from "@/lib/cart/cartContext"
import type { CartItem } from "@/lib/cart/types"

type CartQuantityStepperProps = {
  item: CartItem
}

/**
 * Muestra los controles para aumentar o reducir la cantidad de una línea del carrito.
 * @param props Propiedades del componente.
 * @param props.item Línea del carrito.
 * @returns Controles de cantidad con sus mensajes de disponibilidad.
 */
export function CartQuantityStepper({ item }: CartQuantityStepperProps) {
  const id = useId()
  const { increment_item, decrement_item, item_validation } = useCart()
  const [updating, setUpdating] = useState<"increment" | "decrement" | null>(null)
  const validation = item_validation[item.id]
  const isLoading = !validation || validation.status === "pending"
  const limits = validation?.limits ?? null
  const busy = isLoading || updating !== null
  const currentMessage = validation?.message ?? (!busy && limits && !can_increment_item(item, limits) ? get_cart_add_quantity_message(limits, item.quantity) : null)

  /**
   * Aumenta o reduce un paso la cantidad de la línea mediante increment_item() o decrement_item().
   * @param direction Operación que se desea realizar.
   * @returns Promesa que finaliza al procesar el cambio.
   */
  async function handleChange(direction: "increment" | "decrement"): Promise<void> {
    setUpdating(direction)
    try {
      await (direction === "increment" ? increment_item(item.id) : decrement_item(item.id))
    } catch {
      return
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div>
      <div
        role="group"
        aria-label={`Cantidad de ${item.title}`}
        aria-describedby={currentMessage ? `${id}-message` : undefined}
        aria-busy={busy}
        className="inline-flex items-center rounded-lg border border-input bg-background"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 cursor-pointer rounded-r-none"
          aria-label={`Reducir cantidad de ${item.title}`}
          disabled={busy || !can_decrement_item(item, limits)}
          onClick={() => handleChange("decrement")}
        >
          {updating === "decrement"
            ? <LoaderCircleIcon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            : <MinusIcon aria-hidden="true" />}
        </Button>
        <span aria-live="polite" aria-atomic="true" className="min-w-10 border-x border-input px-2 text-center text-sm font-medium tabular-nums">
          <span className="sr-only">Cantidad: </span>
          {item.quantity}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 cursor-pointer rounded-l-none"
          aria-label={`Aumentar cantidad de ${item.title}`}
          disabled={busy || !can_increment_item(item, limits)}
          onClick={() => handleChange("increment")}
        >
          {updating === "increment"
            ? <LoaderCircleIcon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            : <PlusIcon aria-hidden="true" />}
        </Button>
      </div>
      {currentMessage && <p id={`${id}-message`} role="status" className="mt-2 text-xs text-muted-foreground">{currentMessage}</p>}
    </div>
  )
}
