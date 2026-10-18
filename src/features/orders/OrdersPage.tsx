import { Link } from "react-router-dom"
import { ClipboardListIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { ShopHeader } from "@/components/shop-header"
import { OrdersNotice } from "@/features/orders/components/OrdersNotice"
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge"
import { format_order_date } from "@/lib/orders/orders"
import { useOrders } from "@/lib/orders/ordersContext"
import { cn, format_price } from "@/lib/shared/utils"

/**
 * Lista todos los pedidos del navegador, ordenados del consecutivo más reciente al más antiguo.
 * Permite consultar sus detalles aunque el carrito esté vacío.
 * @returns Listado de pedidos o estado vacío si todavía no se han generado compras.
 */
export default function OrdersPage() {
  const { orders, storage_error, unsaved_order_ids } = useOrders()
  const sorted_orders = orders.toSorted((first, second) => second.order_number - first.order_number)

  return (
    <div className="min-h-dvh bg-background">
      <ShopHeader sticky />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Mis pedidos</h1>
          <p className="mt-2 text-sm text-muted-foreground">Consulta el estado de tus compras.</p>
        </div>
        <OrdersNotice />
        {sorted_orders.length === 0 ? (
          !storage_error && (
            <section className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-input px-6 py-12 text-center">
              <ClipboardListIcon aria-hidden="true" className="mb-4 size-10 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Todavía no tienes pedidos</h2>
              <Link to="/" className={buttonVariants({ size: "lg", className: "mt-6 cursor-pointer" })}>
                Ir al catálogo
              </Link>
            </section>
          )
        ) : (
          <ul aria-label="Pedidos generados" className="space-y-4">
            {sorted_orders.map((order) => (
              <li key={order.id}>
                <article aria-labelledby={`order-${order.id}-title`} className="min-w-0 rounded-xl border border-input bg-card p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id={`order-${order.id}-title`} className="text-lg font-semibold">Pedido #{order.order_number}</h2>
                    <OrderStatusBadge order={order} has_unsaved_result={unsaved_order_ids.includes(order.id)} />
                  </div>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="min-w-0">
                      <dt className="text-sm text-muted-foreground">Fecha</dt>
                      <dd className="mt-1 break-words text-sm font-medium"><time dateTime={order.created_at}>{format_order_date(order.created_at)}</time></dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-sm text-muted-foreground">Moneda</dt>
                      <dd className="mt-1 text-sm font-medium">{order.currency}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-sm text-muted-foreground">Total</dt>
                      <dd className="mt-1 break-words font-semibold">{format_price(order.total, order.currency)}</dd>
                    </div>
                  </dl>
                  <div className="mt-5 flex justify-end">
                    <Link
                      to={`/pedido/${encodeURIComponent(order.id)}`}
                      className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer border-input")}
                      aria-label={`Ver pedido #${order.order_number}`}
                    >
                      Ver pedido
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
