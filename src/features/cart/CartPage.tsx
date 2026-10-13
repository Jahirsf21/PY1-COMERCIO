import { Link } from "react-router-dom"
import { ArrowLeftIcon, ShoppingCartIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ShopHeader } from "@/components/shop-header"
import { useCart } from "@/lib/context/useCart"
import { format_price } from "@/lib/utils"
import { CartItemCard } from "@/features/cart/components/CartItemCard"


export default function CartPage() {
  const { cart, subtotal, shipping, tax, total, total_items: totalUnits } = useCart()

  return (
    <div className="min-h-dvh bg-background">
      <ShopHeader sticky />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
        {cart.length > 0 && (
          <Link
            to="/"
            className="mb-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Volver al catálogo
          </Link>
        )}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Tu carrito</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revisa los productos antes de continuar
          </p>
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
                <CartItemCard key={item.id} item={item} />
              ))}
            </ul>
            <aside className="min-w-0 rounded-xl border border-input bg-card p-5 lg:sticky lg:top-28">
              <h2 className="text-lg font-semibold">Resumen del carrito</h2>
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
              <Button
                nativeButton={false}
                render={<Link to="/checkout" />}
                size="lg"
                className="mt-5 h-11 w-full cursor-pointer"
              >
                Continuar con la compra
              </Button>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
