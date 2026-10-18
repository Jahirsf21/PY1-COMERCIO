import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart/cartContext"
import { cn } from "@/lib/shared/utils"

type CartStatusProps = {
  className?: string
}

/**
 * Muestra los avisos de recuperación, almacenamiento y validación del carrito.
 * @param props Propiedades del componente.
 * @param props.className Clases adicionales del contenedor.
 * @returns Avisos del carrito, o null si no hay avisos.
 */
export function CartStatus({ className }: CartStatusProps) {
  const { cart, storage_error, notice, dismiss_notice, is_validating, can_checkout, revalidate_cart } = useCart()
  const needsReview = cart.length > 0 && !can_checkout && !is_validating
  const mixedCurrencies = new Set(cart.map((item) => item.currency)).size > 1
  if (!storage_error && !notice && !is_validating && !needsReview) return null

  return (
    <div className={cn("space-y-3 rounded-lg border border-input bg-muted/40 p-3 text-sm", className)}>
      {storage_error && <p role="status">Tu carrito solo se conservará mientras esta página esté abierta.</p>}
      {notice && (
        <div className="flex items-start justify-between gap-3">
          <p role="status">{notice}</p>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Cerrar aviso del carrito" onClick={dismiss_notice}>
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      )}
      {is_validating && <p role="status">Comprobando tu carrito…</p>}
      {needsReview && (
        <div className="space-y-2">
          <p role="status">{mixedCurrencies ? "Para continuar, elige productos en una misma moneda." : "Revisa los productos señalados antes de continuar."}</p>
          <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={revalidate_cart}>Actualizar carrito</Button>
        </div>
      )}
    </div>
  )
}
