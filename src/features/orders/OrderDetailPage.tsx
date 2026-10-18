import { Link, useParams } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"
import { ShopHeader } from "@/components/shop-header"
import { CancelOrderDialog } from "@/features/orders/components/CancelOrderDialog"
import { OrderCustomerInfo } from "@/features/orders/components/OrderCustomerInfo"
import { OrderProducts } from "@/features/orders/components/OrderProducts"
import { OrdersNotice } from "@/features/orders/components/OrdersNotice"
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge"
import { PaymentConfirmation } from "@/features/payments/components/PaymentConfirmation"
import { PaymentOrderSummary } from "@/features/payments/components/PaymentOrderSummary"
import { format_order_date, get_order_availability } from "@/lib/orders/orders"
import { useOrders } from "@/lib/orders/ordersContext"

/**
 * Recupera un pedido por su identificador y muestra sus productos, datos del cliente y acciones permitidas.
 * Consulta el estado actual del contexto sin generar otra orden ni modificar el carrito.
 * @returns Detalle del pedido, confirmación de una compra aprobada o aviso de pedido no disponible.
 */
export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const { get_order, storage_error, unsaved_order_ids } = useOrders()
  const order = orderId ? get_order(orderId) : undefined
  const has_unsaved_result = order !== undefined && unsaved_order_ids.includes(order.id)
  const availability = order ? get_order_availability(order, has_unsaved_result) : null

  return (
    <div className="min-h-dvh bg-background">
      <ShopHeader sticky />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
        <OrdersNotice />
        {!order || !availability ? (
          <section className="rounded-xl border border-input bg-card p-6">
            <h1 className="text-2xl font-semibold">{storage_error ? "No pudimos recuperar este pedido" : "No encontramos este pedido"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Revisa tus pedidos o verifica el enlace.</p>
          </section>
        ) : availability.is_confirmed ? (
          <PaymentConfirmation order={order} show_order_link={false} />
        ) : (
          <div className="space-y-6">
            <section aria-labelledby="order-detail-title" className="min-w-0 rounded-xl border border-input bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 id="order-detail-title" className="text-2xl font-semibold">Pedido #{order.order_number}</h1>
                <OrderStatusBadge order={order} has_unsaved_result={has_unsaved_result} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground"><time dateTime={order.created_at}>{format_order_date(order.created_at)}</time></p>
              {(availability.can_pay || availability.can_cancel || availability.is_processing || has_unsaved_result) && (
                <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                  {availability.can_pay && (
                    <Link to={`/pedido/${encodeURIComponent(order.id)}/pago`} className={buttonVariants({ className: "cursor-pointer" })}>
                      Continuar pago
                    </Link>
                  )}
                  {availability.is_processing && (
                    <Link to={`/pedido/${encodeURIComponent(order.id)}/pago`} className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}>
                      Ver estado del pago
                    </Link>
                  )}
                  {has_unsaved_result && (
                    <Link to={`/pedido/${encodeURIComponent(order.id)}/pago`} className={buttonVariants({ className: "cursor-pointer" })}>
                      Revisar resultado
                    </Link>
                  )}
                  {availability.can_cancel && <CancelOrderDialog order={order} />}
                </div>
              )}
            </section>
            <OrderProducts key={order.id} order={order} />
            <PaymentOrderSummary order={order} />
            <OrderCustomerInfo order={order} />
          </div>
        )}
      </main>
    </div>
  )
}
