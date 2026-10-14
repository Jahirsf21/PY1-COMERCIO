import { Link } from "react-router-dom"
import { BrandHeader } from "@/components/brand-header"
import { CartIndicator } from "@/features/cart/components/CartIndicator"
import { cn } from "@/lib/shared/utils"

/**
 * Muestra la marca y el acceso al carrito, con la opción de permanecer visible durante el desplazamiento.
 */
export function ShopHeader({ sticky = false }: { sticky?: boolean }) {
  return (
    <header className={cn(
      "flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-input px-4 py-3 lg:px-6",
      sticky && "sticky top-0 z-40 bg-background",
    )}>
      <Link to="/" aria-label="Ir al catálogo" className="min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <BrandHeader heading={false} />
      </Link>
      <CartIndicator />
    </header>
  )
}
