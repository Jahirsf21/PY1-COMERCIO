import { Link } from "react-router-dom"
import { ShoppingCartIcon } from "lucide-react"
import { useCart } from "@/lib/context/useCart"

export function CartIndicator() {
  const { cart } = useCart()
  const totalUnits = cart.reduce((total, item) => total + item.quantity, 0)

  return (
    <Link
      to="/carrito"
      aria-label={`Carrito: ${totalUnits} ${totalUnits === 1 ? "unidad" : "unidades"}`}
      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ShoppingCartIcon aria-hidden="true" className="size-5" />
      <span className="hidden sm:inline">Carrito</span>
      <span aria-live="polite" aria-atomic="true" className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
        {totalUnits}
      </span>
    </Link>
  )
}
