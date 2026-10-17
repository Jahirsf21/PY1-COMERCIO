import { Link } from "react-router-dom"
import { BrandHeader } from "@/components/brand-header"
import { CartIndicator } from "@/features/cart/components/CartIndicator"
import { cn } from "@/lib/shared/utils"

/**
 * Muestra el encabezado con la marca y el acceso al carrito.
 * @param props Propiedades del componente.
 * @param props.sticky Indica si el encabezado permanece fijo al desplazarse; por defecto, false.
 * @returns Encabezado de la tienda.
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
