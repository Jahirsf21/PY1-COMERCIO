import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeftIcon, ShoppingCartIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { ShopHeader } from "@/components/shop-header"
import { useCart } from "@/lib/cart/cartContext"
import { get_cart_pagination } from "@/lib/cart/cart"
import { format_price } from "@/lib/shared/utils"
import { CartItemCard } from "@/features/cart/components/CartItemCard"
import { CartStatus } from "@/features/cart/components/CartStatus"


export default function CartPage() {
  const { cart, subtotal, shipping, tax, total, total_items: totalUnits, can_checkout } = useCart()
  const [requested_page, set_requested_page] = useState(1)
  const products_container = useRef<HTMLDivElement>(null)
  const { page_items, current_page, total_pages } = get_cart_pagination(cart, requested_page)
  const visible_page_count = Math.min(5, total_pages)
  const first_visible_page = Math.max(1, Math.min(current_page - Math.floor(visible_page_count / 2), total_pages - visible_page_count + 1))
  const visible_pages = Array.from({ length: visible_page_count }, (_, page_index) => first_visible_page + page_index)

  /**
   * Cambia la página visible y desplaza la vista al inicio de los productos.
   * Mantiene el carrito completo para sus totales y validaciones.
   * @param next_page Página de productos que se desea mostrar.
   * @returns No retorna ningún valor.
   */
  function change_page(next_page: number): void {
    if (next_page === current_page || next_page < 1 || next_page > total_pages) return
    set_requested_page(next_page)
    products_container.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    })
  }

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

        <CartStatus className="mb-6" />

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
            <div ref={products_container} className="min-w-0 scroll-mt-28 space-y-4">
              <ul id="cart-products" aria-label="Productos en tu carrito" className="space-y-4">
                {page_items.map((item) => (
                  <CartItemCard key={item.id} item={item} />
                ))}
              </ul>
              {total_pages > 1 && (
                <Pagination aria-label="Paginación de productos del carrito" className="flex-wrap items-center gap-3 border-t border-input bg-background p-2">
                  <PaginationContent className="flex-wrap justify-center">
                    <PaginationItem>
                      <PaginationPrevious
                        href="#/carrito"
                        aria-label="Página anterior"
                        aria-controls="cart-products"
                        aria-disabled={current_page === 1}
                        tabIndex={current_page === 1 ? -1 : undefined}
                        className={current_page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        onClick={(event) => {
                          event.preventDefault()
                          if (current_page > 1) change_page(current_page - 1)
                        }}
                      />
                    </PaginationItem>
                    {visible_pages.map((page_number) => (
                      <PaginationItem key={page_number}>
                        <PaginationLink
                          href="#/carrito"
                          isActive={page_number === current_page}
                          className="cursor-pointer"
                          aria-label={`Página ${page_number}`}
                          aria-controls="cart-products"
                          onClick={(event) => {
                            event.preventDefault()
                            change_page(page_number)
                          }}
                        >
                          {page_number}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#/carrito"
                        aria-label="Página siguiente"
                        aria-controls="cart-products"
                        aria-disabled={current_page === total_pages}
                        tabIndex={current_page === total_pages ? -1 : undefined}
                        className={current_page === total_pages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        onClick={(event) => {
                          event.preventDefault()
                          if (current_page < total_pages) change_page(current_page + 1)
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
            <aside className="min-w-0 rounded-xl border border-input bg-card p-5 lg:sticky lg:top-28">
              <h2 className="text-lg font-semibold">Resumen del carrito</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Unidades</dt>
                  <dd className="font-medium">{totalUnits}</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="break-words font-medium">{can_checkout ? format_price(subtotal, cart[0].currency) : "—"}</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground">Impuestos (13 %)</dt>
                  <dd className="break-words font-medium">{can_checkout ? format_price(tax, cart[0].currency) : "—"}</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground">Envío</dt>
                  <dd className="break-words font-medium">{can_checkout ? shipping === 0 ? "Gratis" : format_price(shipping, cart[0].currency) : "—"}</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-input pt-4">
                  <dt className="text-base font-semibold">Total</dt>
                  <dd className="break-words text-lg font-semibold">{can_checkout ? format_price(total, cart[0].currency) : "—"}</dd>
                </div>
              </dl>
              <Button
                nativeButton={false}
                render={<Link to="/checkout" />}
                disabled={!can_checkout}
                onClick={(event) => { if (!can_checkout) event.preventDefault() }}
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
