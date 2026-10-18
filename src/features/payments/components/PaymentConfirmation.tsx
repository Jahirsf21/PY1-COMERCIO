import { Link } from "react-router-dom"
import { CircleCheckIcon } from "lucide-react"
import { PaymentOrderSummary } from "@/features/payments/components/PaymentOrderSummary"
import { OrderCustomerInfo } from "@/features/orders/components/OrderCustomerInfo"
import { OrderProducts } from "@/features/orders/components/OrderProducts"
import { format_order_date } from "@/lib/orders/orders"
import type { OrderDetails } from "@/lib/orders/types"

type PaymentConfirmationProps = {
  order: OrderDetails
  show_order_link?: boolean
}

/**
 * Presenta una compra confirmada en una sola columna con la aprobación centrada.
 * Muestra primero los productos y montos, y después los datos del cliente y la entrega guardados en la orden.
 * @param props Propiedades de la confirmación.
 * @param props.order Orden cuyo pago aprobado ya se guardó correctamente.
 * @param props.show_order_link Indica si se ofrece un acceso al detalle; por defecto, true.
 * @returns Confirmación, resumen de productos e información del cliente y la entrega.
 */
export function PaymentConfirmation({ order, show_order_link = true }: PaymentConfirmationProps) {
  return (
    <div className="space-y-6">
      <section role="status" aria-labelledby="payment-confirmation-title" className="rounded-xl border border-input bg-card px-5 py-8 text-center sm:p-8">
        <CircleCheckIcon aria-hidden="true" className="mx-auto mb-4 size-12 text-primary" />
        <h1 id="payment-confirmation-title" className="text-2xl font-semibold">Compra confirmada</h1>
        <p className="mt-2 text-lg font-medium">¡Pago aprobado!</p>
        <p className="mt-2 text-sm text-muted-foreground">Orden #{order.order_number}</p>
        <p className="mt-1 text-sm text-muted-foreground"><time dateTime={order.created_at}>{format_order_date(order.created_at)}</time></p>
        <p className="mt-1 text-sm text-muted-foreground">Tu compra se completó correctamente.</p>
      </section>

      <OrderProducts key={order.id} order={order} />
      <PaymentOrderSummary order={order} />

      <OrderCustomerInfo order={order} />

      <div className="flex flex-wrap justify-center gap-3">
        {show_order_link && (
          <Link to={`/pedido/${encodeURIComponent(order.id)}`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Ver pedido
          </Link>
        )}
        <Link to="/" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}
