import { Button } from "@/components/ui/button"
import { CartItemCard } from "@/features/cart/components/CartItemCard"
import { useCart } from "@/lib/cart/cartContext"
import { format_price } from "@/lib/shared/utils"

export function CheckoutOrderSummary() {
  const { cart, subtotal, shipping, tax, total, total_items: totalUnits } = useCart()
  const currency = cart[0]?.currency ?? "CRC"

  return (
    <aside aria-labelledby="checkout-order-summary-title" className="min-w-0 rounded-xl border border-input bg-card p-5 lg:sticky lg:top-28">
      <h2 id="checkout-order-summary-title" className="text-lg font-semibold">2. Resumen de la orden</h2>
      <ul aria-label="Productos del pedido" className="mt-5 space-y-4">
        {cart.map((item) => (
          <CartItemCard key={item.id} item={item} />
        ))}
      </ul>
      <dl className="mt-6 space-y-3 border-t border-input pt-5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Unidades</dt>
          <dd className="font-medium">{totalUnits}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="break-words font-medium">{format_price(subtotal, currency)}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">Impuestos (13 %)</dt>
          <dd className="break-words font-medium">{format_price(tax, currency)}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">Envío</dt>
          <dd className="break-words font-medium">{shipping === 0 ? "Gratis" : format_price(shipping, currency)}</dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-input pt-4">
          <dt className="text-base font-semibold">Total</dt>
          <dd className="break-words text-lg font-semibold">{format_price(total, currency)}</dd>
        </div>
      </dl>
      <Button type="submit" form="checkout-form" size="lg" className="mt-5 h-11 w-full cursor-pointer">
        Generar orden de compra
      </Button>
    </aside>
  )
}
