import { LoaderCircleIcon } from "lucide-react"
import { get_order_availability } from "@/lib/orders/orders"
import type { OrderDetails } from "@/lib/orders/types"
import { cn } from "@/lib/shared/utils"

type OrderStatusBadgeProps = {
  order: OrderDetails
  has_unsaved_result?: boolean
}

/**
 * Presenta el estado de un pedido sin anunciar como confirmado un resultado todavía no guardado.
 * Distingue los estados con colores de alto contraste y conserva sus etiquetas de texto.
 * @param props Pedido y estado de guardado de su resultado.
 * @returns Etiqueta del estado actual del pedido.
 */
export function OrderStatusBadge({ order, has_unsaved_result = false }: OrderStatusBadgeProps) {
  const { status_label, is_confirmed, is_processing } = get_order_availability(order, has_unsaved_result)
  const status_class = has_unsaved_result ? "border-violet-700 bg-violet-700 text-white"
    : is_confirmed ? "border-emerald-700 bg-emerald-700 text-white"
      : order.status === "CANCELLED" ? "border-rose-700 bg-rose-700 text-white"
        : is_processing ? "border-sky-700 bg-sky-700 text-white"
          : "border-amber-300 bg-amber-300 text-amber-950"

  return (
    <span className={cn(
      "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
      status_class,
    )}>
      {is_processing && <LoaderCircleIcon aria-hidden="true" className="size-3.5 motion-safe:animate-spin" />}
      {status_label}
    </span>
  )
}
