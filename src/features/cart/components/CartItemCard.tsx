import { Link } from "react-router-dom"
import { CartQuantityStepper } from "@/features/cart/components/CartQuantityStepper"
import { RemoveCartItemDialog } from "@/features/cart/components/RemoveCartItemDialog"
import { get_item_subtotal } from "@/lib/cart"
import type { CartItem } from "@/lib/types/cart"
import { format_price } from "@/lib/utils"

type CartItemCardProps = {
  item: CartItem
}

/**
 * Muestra una línea del carrito con controles de cantidad y eliminación con confirmación.
 * Se adapta al ancho disponible para reutilizarla en el carrito y en el checkout.
 */
export function CartItemCard({ item }: CartItemCardProps) {
  return (
    <li className="@container min-w-0 rounded-xl border border-input bg-card p-4">
      <div className="grid gap-4 @sm:grid-cols-[96px_minmax(0,1fr)]">
        <img src={item.image.url} alt={item.image.alt} className="size-24 rounded-lg bg-muted object-contain" loading="lazy" />
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/producto/${encodeURIComponent(item.product_id)}?${new URLSearchParams({ variante: item.sku, talla: item.selected_size })}`}
              className="rounded-sm font-medium leading-snug break-words hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.title}
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">Talla: {item.selected_size}</p>
          </div>
          <RemoveCartItemDialog item={item} />
        </div>
        <dl className="grid gap-4 border-t border-input pt-4 @min-[260px]:grid-cols-2 @sm:col-span-2 @lg:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Precio unitario</dt>
            <dd className="mt-1 break-words text-sm font-medium">{format_price(item.unit_price, item.currency)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Cantidad</dt>
            <dd className="mt-1">
              <CartQuantityStepper item={item} />
            </dd>
          </div>
          <div className="min-w-0 @min-[260px]:col-span-2 @lg:col-span-1">
            <dt className="text-xs text-muted-foreground">Subtotal</dt>
            <dd className="mt-1 break-words font-semibold">{format_price(get_item_subtotal(item), item.currency)}</dd>
          </div>
        </dl>
      </div>
    </li>
  )
}
