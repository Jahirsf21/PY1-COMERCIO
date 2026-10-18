import { useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { get_order_pagination } from "@/lib/orders/orders"
import type { OrderDetails } from "@/lib/orders/types"
import { format_price } from "@/lib/shared/utils"

type OrderProductsProps = {
  order: OrderDetails
}

/**
 * Muestra los productos guardados de una orden con el formato de tarjetas y paginación del checkout.
 * Mantiene las cantidades y los precios de solo lectura, sin consultar ni modificar el carrito.
 * @param props Propiedades de los productos del pedido.
 * @param props.order Orden con los productos y la moneda guardados.
 * @returns Productos de la orden paginados de cuatro en cuatro.
 */
export function OrderProducts({ order }: OrderProductsProps) {
  const { pathname, search } = useLocation()
  const [requested_page, set_requested_page] = useState(1)
  const products_container = useRef<HTMLElement>(null)
  const { page_items, current_page, total_pages } = get_order_pagination(order.items, requested_page)
  const total_units = order.items.reduce((units, item) => units + item.quantity, 0)
  const visible_page_count = Math.min(5, total_pages)
  const first_visible_page = Math.max(1, Math.min(current_page - Math.floor(visible_page_count / 2), total_pages - visible_page_count + 1))
  const visible_pages = Array.from({ length: visible_page_count }, (_, page_index) => first_visible_page + page_index)
  const page_href = `#${pathname}${search}`

  /**
   * Cambia la página de productos sin navegar, modificar el pedido ni enviar el formulario de pago.
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
    <section ref={products_container} aria-labelledby="order-products-title" className="min-w-0 scroll-mt-28 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="order-products-title" className="text-lg font-semibold">Productos de la orden</h2>
        <p className="text-sm text-muted-foreground">{total_units} {total_units === 1 ? "unidad" : "unidades"}</p>
      </div>
      <ul id="order-products" aria-label="Productos del pedido" className="space-y-4">
        {page_items.map((item) => (
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
      {total_pages > 1 && (
        <Pagination aria-label="Paginación de productos de la orden" className="flex-wrap items-center gap-3 border-t border-input bg-background p-2">
          <PaginationContent className="flex-wrap justify-center">
            <PaginationItem>
              <PaginationPrevious
                href={page_href}
                aria-label="Página anterior"
                aria-controls="order-products"
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
                  href={page_href}
                  isActive={page_number === current_page}
                  className="cursor-pointer"
                  aria-label={`Página ${page_number}`}
                  aria-controls="order-products"
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
                href={page_href}
                aria-label="Página siguiente"
                aria-controls="order-products"
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
