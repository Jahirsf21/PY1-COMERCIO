import { Link, useParams } from "react-router-dom"
import { ArrowLeftIcon, CircleCheckIcon } from "lucide-react"
import { ShopHeader } from "@/components/shop-header"
import { PaymentForm } from "@/features/payments/components/PaymentForm"
import { PaymentOrderSummary } from "@/features/payments/components/PaymentOrderSummary"
import { get_order_payment_block } from "@/lib/orders/orders"
import { useOrders } from "@/lib/orders/ordersContext"

/**
 * Muestra el pago y la confirmación de una orden recuperada mediante su identificador.
 * Usa la orden guardada para funcionar al recargar o con el carrito vacío.
 * @returns Página de pago, confirmación o aviso si la orden no está disponible.
 */
export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const { get_order, storage_error, notice } = useOrders()
  const order = orderId ? get_order(orderId) : undefined
  const is_confirmed = order?.status === "CONFIRMED" && order.payment?.status === "APPROVE"
  const is_blocked = order && (order.status !== "PENDING" || order.payment?.status === "APPROVE")

  return (
    <div className="min-h-dvh bg-background">
      <ShopHeader sticky />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
        <Link to="/" className="mb-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Volver al catálogo
        </Link>
        {storage_error && (
          <p role="alert" className="mb-5 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
            No pudimos guardar o recuperar tus pedidos en este navegador. Revisa sus permisos de almacenamiento antes de continuar.
          </p>
        )}
        {notice && <p role="status" className="mb-5 rounded-lg border border-input bg-muted/40 p-4 text-sm">{notice}</p>}
        {!order ? (
          <section className="rounded-xl border border-input bg-card p-6">
            <h1 className="text-2xl font-semibold">No encontramos esta orden</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Verifica el enlace y utiliza el navegador donde realizaste la compra.
            </p>
          </section>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">{is_confirmed ? "Compra confirmada" : "Pago de tu orden"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Orden #{order.order_number}</p>
            <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
              {is_confirmed ? (
                <section role="status" aria-labelledby="payment-confirmation-title" className="rounded-xl border border-input bg-card p-5 sm:p-6">
                  <CircleCheckIcon aria-hidden="true" className="mb-4 size-10 text-primary" />
                  <h2 id="payment-confirmation-title" className="text-lg font-semibold">¡Pago aprobado!</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Tu orden #{order.order_number} fue confirmada. Tu compra se completó correctamente.
                  </p>
                  <Link to="/" className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Seguir comprando
                  </Link>
                </section>
              ) : is_blocked ? (
                <section className="rounded-xl border border-input bg-card p-5 sm:p-6">
                  <h2 className="text-lg font-semibold">Esta orden no admite pagos</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{get_order_payment_block(order)}</p>
                </section>
              ) : (
                <PaymentForm key={order.id} order={order} />
              )}
              <PaymentOrderSummary order={order} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
