import { useEffect, useId, useState } from "react"
import { LoaderCircleIcon, MinusIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { can_decrement_item, can_increment_item, get_cart_add_quantity_message, is_valid_cart_quantity } from "@/lib/cart/cart"
import { useCart } from "@/lib/cart/cartContext"
import { getCartQuantityLimits } from "@/lib/catalog/catalog"
import type { CartItem, CartQuantityLimits } from "@/lib/cart/types"

type CartQuantityStepperProps = {
  item: CartItem
}

/**
 * Permite aumentar o reducir las unidades de una línea del carrito.
 * Respeta el mínimo, el máximo y el paso del producto, consultando su disponibilidad.
 * La eliminación del producto se realiza únicamente mediante el botón "Eliminar".
 * @param props Propiedades del componente.
 * @param props.item Producto del carrito cuya cantidad se desea modificar.
 * @returns Controles de cantidad con sus mensajes de disponibilidad y estado.
 */
export function CartQuantityStepper({ item }: CartQuantityStepperProps) {
  const id = useId()
  const { increment_item, decrement_item } = useCart()
  const [updating, setUpdating] = useState<"increment" | "decrement" | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [result, setResult] = useState<{ key: string; limits: CartQuantityLimits | null; error?: string } | null>(null)
  const lookupKey = `${item.id}::${item.quantity}::${refresh}`
  const isLoading = result?.key !== lookupKey
  const limits = !isLoading ? result.limits : null
  const lookupError = !isLoading ? result.error : undefined

  useEffect(() => {
    let active = true
    getCartQuantityLimits(item.product_id, item.sku, item.selected_size)
      .then((currentLimits) => {
        if (active) setResult({ key: lookupKey, limits: currentLimits })
      })
      .catch(() => {
        if (active) setResult({ key: lookupKey, limits: null, error: "No pudimos comprobar la disponibilidad. Intenta de nuevo." })
      })
    return () => { active = false }
  }, [item.product_id, item.sku, item.selected_size, lookupKey])

  const invalidQuantity = !isLoading && !lookupError && !is_valid_cart_quantity(item.quantity, limits)
  const busy = isLoading || updating !== null
  const currentMessage = lookupError ?? message ?? (invalidQuantity
    ? "Cantidad no disponible. Quita el producto y vuelve a agregarlo."
    : !busy && limits && !can_increment_item(item, limits) ? get_cart_add_quantity_message(limits, item.quantity) : null)

  /**
   * Solicita aumentar o reducir la cantidad según el paso del producto.
   * El proveedor vuelve a consultar las reglas antes de aceptar el cambio.
   * @param direction Operación que se desea realizar.
   * @returns Promesa que finaliza al completar la actualización.
   */
  async function handleChange(direction: "increment" | "decrement"): Promise<void> {
    setUpdating(direction)
    setMessage(null)
    try {
      const accepted = await (direction === "increment" ? increment_item(item.id) : decrement_item(item.id))
      if (!accepted) {
        setMessage("No puedes seleccionar esa cantidad.")
        setRefresh((previous) => previous + 1)
      }
    } catch {
      setMessage("No pudimos actualizar la cantidad. Intenta nuevamente.")
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
      {isLoading && <p role="status" className="mt-2 text-xs text-muted-foreground">Comprobando disponibilidad…</p>}
      {currentMessage && <p id={`${id}-message`} role="status" className="mt-2 text-xs text-muted-foreground">{currentMessage}</p>}
      {lookupError && <Button type="button" variant="link" size="sm" onClick={() => setRefresh((previous) => previous + 1)}>Reintentar</Button>}
    </div>
  )
}
