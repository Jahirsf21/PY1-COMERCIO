import { useId, useState } from "react"
import type { ReactNode } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/features/catalog/components/product/ProductCard"
import type { ProductHit } from "@/lib/catalog/types"

type ProductSuggestionsListProps = {
  products: ProductHit[]
  title: ReactNode
}

/**
 * Muestra las sugerencias en grupos de 4 con controles para cambiar de grupo.
 * @param props Propiedades del componente.
 * @param props.products Variantes sugeridas.
 * @param props.title Encabezado de la sección.
 * @returns Encabezado con los controles y el grupo de sugerencias seleccionado.
 */
export function ProductSuggestionsList({ products, title }: ProductSuggestionsListProps) {
  const list_id = useId()
  const [requested_page, set_requested_page] = useState(1)
  const items_per_page = 4
  const total_pages = Math.ceil(products.length / items_per_page)
  const current_page = Math.min(requested_page, Math.max(total_pages, 1))
  const first_product_index = (current_page - 1) * items_per_page
  const page_products = products.slice(first_product_index, first_product_index + items_per_page)

  /**
   * Cambia el grupo de sugerencias visible.
   * @param next_page Grupo que se desea mostrar, empezando en 1.
   * @returns No retorna ningún valor.
   */
  function change_page(next_page: number): void {
    if (next_page === current_page || next_page < 1 || next_page > total_pages) return
    set_requested_page(next_page)
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        {title}
        {total_pages > 1 && (
          <div role="group" aria-label="Navegación de productos sugeridos" className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="cursor-pointer"
              aria-label="Sugerencias anteriores"
              aria-controls={list_id}
              disabled={current_page === 1}
              onClick={() => change_page(current_page - 1)}
            >
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="cursor-pointer"
              aria-label="Sugerencias siguientes"
              aria-controls={list_id}
              disabled={current_page === total_pages}
              onClick={() => change_page(current_page + 1)}
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
            <span role="status" className="sr-only">Grupo {current_page} de {total_pages}</span>
          </div>
        )}
      </div>
      <ul id={list_id} aria-label="Productos sugeridos" className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {page_products.map((product) => (
          <li key={product.product_id} className="grid min-w-0">
            <ProductCard hit={product} />
          </li>
        ))}
      </ul>
    </>
  )
}
