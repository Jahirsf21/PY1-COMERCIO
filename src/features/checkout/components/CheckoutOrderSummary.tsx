import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart/cartContext"
import { useOrders } from "@/lib/orders/ordersContext"
import { format_price } from "@/lib/shared/utils"

/**
 * Presenta los montos del checkout debajo de los productos, sin repetir sus tarjetas ni el total de unidades.
 * Mantiene la generación de la orden bloqueada mientras el carrito no es válido o se está guardando.
 * @returns Resumen de subtotal, impuestos, envío y total con el botón para generar la orden.
 */
export function CheckoutOrderSummary() {
  const { cart, subtotal, shipping, tax, total, can_checkout } = useCart()
  const { is_creating_order } = useOrders()
  const currency = cart[0]?.currency ?? "CRC"

  return (
    <section aria-labelledby="checkout-order-summary-title" className="min-w-0 rounded-xl border border-input bg-card p-5">
      <h2 id="checkout-order-summary-title" className="text-lg font-semibold">2. Resumen de la orden</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="break-words font-medium">{can_checkout ? format_price(subtotal, currency) : "—"}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">Impuestos (13 %)</dt>
          <dd className="break-words font-medium">{can_checkout ? format_price(tax, currency) : "—"}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">Envío</dt>
          <dd className="break-words font-medium">{can_checkout ? shipping === 0 ? "Gratis" : format_price(shipping, currency) : "—"}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-input pt-4">
          <dt className="text-base font-semibold">Total</dt>
          <dd className="break-words text-lg font-semibold">{can_checkout ? format_price(total, currency) : "—"}</dd>
        </div>
      </dl>
      <Button type="submit" form="checkout-form" disabled={!can_checkout || is_creating_order} size="lg" className="mt-5 h-11 w-full cursor-pointer">
        {is_creating_order ? "Generando orden…" : "Generar orden de compra"}
      </Button>
    </section>
  )
}
