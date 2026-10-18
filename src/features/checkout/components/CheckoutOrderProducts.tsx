import { useRef, useState } from "react"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { CartItemCard } from "@/features/cart/components/CartItemCard"
import { CartStatus } from "@/features/cart/components/CartStatus"
import { get_cart_pagination } from "@/lib/cart/cart"
import { useCart } from "@/lib/cart/cartContext"

/**
 * Muestra debajo del formulario los productos de la orden que todavía están en el carrito.
 * Reutiliza sus tarjetas, controles, avisos y paginación de cuatro productos por página.
 * @returns Productos del checkout con sus controles de paginación cuando hay más de una página.
 */
export function CheckoutOrderProducts() {
  const { cart, total_items } = useCart()
  const [requested_page, set_requested_page] = useState(1)
  const products_container = useRef<HTMLElement>(null)
  const { page_items, current_page, total_pages } = get_cart_pagination(cart, requested_page)
  const visible_page_count = Math.min(5, total_pages)
  const first_visible_page = Math.max(1, Math.min(current_page - Math.floor(visible_page_count / 2), total_pages - visible_page_count + 1))
  const visible_pages = Array.from({ length: visible_page_count }, (_, page_index) => first_visible_page + page_index)

  /**
   * Cambia la página de productos y desplaza la vista al inicio de su sección sin enviar el formulario.
   * @param next_page Página que se desea mostrar.
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
    <section ref={products_container} aria-labelledby="checkout-order-products-title" className="min-w-0 scroll-mt-28 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="checkout-order-products-title" className="text-lg font-semibold">Productos de la orden</h2>
        <p className="text-sm text-muted-foreground">{total_items} {total_items === 1 ? "unidad" : "unidades"}</p>
      </div>
      <CartStatus />
      <ul id="checkout-order-products" aria-label="Productos de la orden" className="space-y-4">
        {page_items.map((item) => (
          <CartItemCard key={item.id} item={item} />
        ))}
      </ul>
      {total_pages > 1 && (
        <Pagination aria-label="Paginación de productos de la orden" className="flex-wrap items-center gap-3 border-t border-input bg-background p-2">
          <PaginationContent className="flex-wrap justify-center">
            <PaginationItem>
              <PaginationPrevious
                href="#/checkout"
                aria-label="Página anterior"
                aria-controls="checkout-order-products"
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
                  href="#/checkout"
                  isActive={page_number === current_page}
                  className="cursor-pointer"
                  aria-label={`Página ${page_number}`}
                  aria-controls="checkout-order-products"
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
                href="#/checkout"
                aria-label="Página siguiente"
                aria-controls="checkout-order-products"
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
    </section>
  )
}
