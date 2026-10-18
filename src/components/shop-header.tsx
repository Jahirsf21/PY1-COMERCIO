import { Link, useMatch } from "react-router-dom"
import { ClipboardListIcon } from "lucide-react"
import { BrandHeader } from "@/components/brand-header"
import { CartIndicator } from "@/features/cart/components/CartIndicator"
import { cn } from "@/lib/shared/utils"

/**
 * Muestra el encabezado con la marca y los accesos a pedidos y carrito.
 * @param props Propiedades del componente.
 * @param props.sticky Indica si el encabezado permanece fijo al desplazarse; por defecto, false.
 * @returns Encabezado de la tienda.
 */
export function ShopHeader({ sticky = false }: { sticky?: boolean }) {
  const is_orders_page = useMatch("/pedidos") !== null
  const is_order_page = useMatch("/pedido/*") !== null
  return (
    <header className={cn(
      "flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-input px-4 py-3 lg:px-6",
      sticky && "sticky top-0 z-40 bg-background",
    )}>
      <Link to="/" aria-label="Ir al catálogo" className="min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <BrandHeader heading={false} />
      </Link>
      <nav aria-label="Navegación de la tienda" className="flex shrink-0 items-center gap-2">
        <Link
          to="/pedidos"
          aria-current={is_orders_page || is_order_page ? "page" : undefined}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-muted"
        >
          <ClipboardListIcon aria-hidden="true" className="size-4" />
          Mis pedidos
        </Link>
        <CartIndicator />
      </nav>
    </header>
  )
}
