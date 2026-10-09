import { Link } from "react-router-dom"
import { ArrowLeftIcon, ShoppingCartIcon } from "lucide-react"
import { ShopHeader } from "@/components/shop-header"
import { useCart } from "@/lib/context/useCart"
import { get_item_subtotal } from "@/lib/cart"
import { format_price } from "@/lib/utils"
import { CartQuantityStepper } from "@/features/cart/components/CartQuantityStepper"
import { RemoveCartItemDialog } from "@/features/cart/components/RemoveCartItemDialog"


export default function CartPage() {
  const { cart, subtotal, shipping, tax, total, total_items: totalUnits } = useCart()

  return (
    <div className="min-h-dvh bg-background">
      <ShopHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Volver al catálogo
        </Link>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Tu carrito</h1>
          {cart.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {totalUnits} {totalUnits === 1 ? "unidad" : "unidades"} en tu carrito
            </p>
          )}
        </div>

        {cart.length === 0 ? (
          <section className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-input px-6 py-12 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
              <ShoppingCartIcon aria-hidden="true" className="size-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Tu carrito está vacío</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Explora nuestro catálogo y agrega los productos que quieras comprar.
            </p>
            <Link to="/" className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Volver al catálogo
            </Link>
          </section>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <ul aria-label="Productos en tu carrito" className="min-w-0 space-y-4">
              {cart.map((item) => (
                <li key={item.id} className="grid gap-4 rounded-xl border border-input bg-card p-4 sm:grid-cols-[96px_minmax(0,1fr)]">
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
                  <dl className="grid grid-cols-2 gap-4 border-t border-input pt-4 sm:col-span-2 sm:grid-cols-3">
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">Precio unitario</dt>
                      <dd className="mt-1 break-words text-sm font-medium">{format_price(item.unit_price, item.currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Cantidad</dt>
                      <dd className="mt-1">
                        <CartQuantityStepper item={item} />
                      </dd>
                    </div>
                    <div className="col-span-2 min-w-0 sm:col-span-1">
                      <dt className="text-xs text-muted-foreground">Subtotal</dt>
                      <dd className="mt-1 break-words font-semibold">{format_price(get_item_subtotal(item), item.currency)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
            <aside className="min-w-0 rounded-xl border border-input bg-card p-5 lg:sticky lg:top-6">
              <h2 className="text-lg font-semibold">Resumen de compra</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Unidades</dt>
                  <dd className="font-medium">{totalUnits}</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="break-words font-medium">{format_price(subtotal, cart[0].currency)}</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground">Impuestos (13 %)</dt>
                  <dd className="break-words font-medium">{format_price(tax, cart[0].currency)}</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground">Envío</dt>
                  <dd className="break-words font-medium">{shipping === 0 ? "Gratis" : format_price(shipping, cart[0].currency)}</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-input pt-4">
                  <dt className="text-base font-semibold">Total</dt>
                  <dd className="break-words text-lg font-semibold">{format_price(total, cart[0].currency)}</dd>
                </div>
              </dl>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
