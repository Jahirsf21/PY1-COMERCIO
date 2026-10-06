import { useState } from "react"
import { Link, useMatch } from "react-router-dom"
import { ShoppingCartIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger } from "@/components/ui/sheet"
import { CartPreview } from "@/features/cart/components/CartPreview"
import { useCart } from "@/lib/context/useCart"

export function CartIndicator() {
  const { total_items: totalUnits } = useCart()
  const [open, setOpen] = useState(false)
  const isCartPage = useMatch("/carrito") !== null

  const indicator = (
    <>
      <ShoppingCartIcon aria-hidden="true" className="size-5" />
      <span className="hidden sm:inline">Carrito</span>
      <span aria-live="polite" aria-atomic="true" className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
        {totalUnits}
      </span>
    </>
  )

  if (isCartPage) {
    return (
      <Link
        to="/carrito"
        aria-current="page"
        aria-label={`Carrito: ${totalUnits} ${totalUnits === 1 ? "unidad" : "unidades"}`}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {indicator}
      </Link>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={`Vista previa del carrito: ${totalUnits} ${totalUnits === 1 ? "unidad" : "unidades"}`}
        render={<Button type="button" variant="outline" className="h-10 cursor-pointer gap-2 px-3" />}
      >
        {indicator}
      </SheetTrigger>
      <CartPreview onClose={() => setOpen(false)} />
    </Sheet>
  )
}
