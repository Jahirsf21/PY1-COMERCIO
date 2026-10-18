import type { OrderDetails } from "@/lib/orders/types"
import { format_price } from "@/lib/shared/utils"

type PaymentOrderSummaryProps = {
  order: OrderDetails
}

/**
 * Muestra los productos y montos guardados en la orden que se va a pagar.
 * @param props Propiedades del componente.
 * @param props.order Orden persistida con sus productos y moneda.
 * @returns Resumen de la compra independiente del carrito actual.
 */
export function PaymentOrderSummary({ order }: PaymentOrderSummaryProps) {
  const totalUnits = order.items.reduce((units, item) => units + item.quantity, 0)

  return (
    <aside aria-labelledby="payment-order-summary-title" className="min-w-0 rounded-xl border border-input bg-card p-5">
      <h2 id="payment-order-summary-title" className="text-lg font-semibold">Resumen de la compra</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Orden <span className="font-medium text-foreground">#{order.order_number}</span> · Moneda: {order.currency}
      </p>
      <ul aria-label="Productos del pedido" className="mt-5 space-y-4">
        {order.items.map((item) => (
          <li key={item.id} className="@container min-w-0 rounded-xl border border-input bg-card p-4">
            <div className="grid gap-4 @sm:grid-cols-[96px_minmax(0,1fr)]">
              <img src={item.image.url} alt={item.image.alt} className="size-24 rounded-lg bg-muted object-contain" loading="lazy" />
              <div className="min-w-0">
                <h3 className="font-medium leading-snug break-words">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">Talla: {item.selected_size}</p>
              </div>
              <dl className="grid gap-4 border-t border-input pt-4 @min-[260px]:grid-cols-2 @sm:col-span-2 @lg:grid-cols-3">
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Precio unitario</dt>
                  <dd className="mt-1 break-words text-sm font-medium">{format_price(item.unit_price, order.currency)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Cantidad</dt>
                  <dd className="mt-1 text-sm font-medium">{item.quantity}</dd>
                </div>
                <div className="min-w-0 @min-[260px]:col-span-2 @lg:col-span-1">
                  <dt className="text-xs text-muted-foreground">Subtotal</dt>
                  <dd className="mt-1 break-words font-semibold">{format_price(item.subtotal, order.currency)}</dd>
                </div>
              </dl>
            </div>
          </li>
        ))}
      </ul>
      <dl className="mt-6 space-y-3 border-t border-input pt-5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Unidades</dt>
          <dd className="font-medium">{totalUnits}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="break-words font-medium">{format_price(order.subtotal, order.currency)}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">IVA (13 %)</dt>
          <dd className="break-words font-medium">{format_price(order.tax, order.currency)}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">Envío</dt>
          <dd className="break-words font-medium">{order.shipping === 0 ? "Gratis" : format_price(order.shipping, order.currency)}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-input pt-4">
          <dt className="text-base font-semibold">Total</dt>
          <dd className="break-words text-lg font-semibold">{format_price(order.total, order.currency)}</dd>
        </div>
      </dl>
    </aside>
  )
}
