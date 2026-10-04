import { Link } from "react-router-dom"
import { ArrowLeftIcon, ShoppingCartIcon } from "lucide-react"
import { ShopHeader } from "@/components/shop-header"
import { useCart } from "@/lib/context/useCart"
import { get_item_subtotal } from "@/lib/cart"

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency }).format(value)
}

export default function CartPage() {
  const { cart, subtotal, total_items: totalUnits } = useCart()

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
                  <div className="min-w-0">
                    <Link
                      to={`/producto/${encodeURIComponent(item.product_id)}?${new URLSearchParams({ variante: item.sku, talla: item.selected_size })}`}
                      className="rounded-sm font-medium leading-snug break-words hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-2 text-sm text-muted-foreground">Talla: {item.selected_size}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-4 border-t border-input pt-4 sm:col-span-2 sm:grid-cols-3">
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">Precio unitario</dt>
                      <dd className="mt-1 break-words text-sm font-medium">{formatPrice(item.unit_price, item.currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Cantidad</dt>
                      <dd className="mt-1 text-sm font-medium">{item.quantity}</dd>
                    </div>
                    <div className="col-span-2 min-w-0 sm:col-span-1">
                      <dt className="text-xs text-muted-foreground">Subtotal</dt>
                      <dd className="mt-1 break-words font-semibold">{formatPrice(get_item_subtotal(item), item.currency)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
            <aside className="min-w-0 rounded-xl border border-input bg-card p-5 lg:sticky lg:top-6">
              <h2 className="text-lg font-semibold">Resumen de compra</h2>
              <div className="mt-4 flex items-center justify-between gap-3 border-b border-input pb-4 text-sm">
                <span className="text-muted-foreground">Unidades</span>
                <span className="font-medium">{totalUnits}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">Subtotal</span>
                <span className="break-words text-lg font-semibold">{formatPrice(subtotal, cart[0].currency)}</span>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
