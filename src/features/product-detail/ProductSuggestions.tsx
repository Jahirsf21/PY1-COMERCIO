import { useEffect, useState } from "react"
import { ProductSuggestionsList } from "@/components/product-suggestions-list"
import { Button } from "@/components/ui/button"
import { get_product_suggestions } from "@/lib/catalog/catalog"
import type { ProductRecord, ProductSuggestionsResult } from "@/lib/catalog/types"
import { get_suggestion_categories } from "@/lib/shared/utils"

type ProductSuggestionsProps = {
  product: Pick<ProductRecord, "product_id" | "categories">
}

/**
 * Muestra hasta 20 sugerencias según las categorías del producto, en grupos de 4.
 * Consulta las sugerencias con get_product_suggestions() y permite reintentar si falla la consulta.
 * @param props Propiedades del componente.
 * @param props.product Identificador y categorías del producto.
 * @returns Sección de sugerencias con sus estados de carga, error y sin resultados.
 */
export function ProductSuggestions({ product }: ProductSuggestionsProps) {
  const [retry_count, set_retry_count] = useState(0)
  const [suggestion_result, set_suggestion_result] = useState<ProductSuggestionsResult | null>(null)
  const product_key = JSON.stringify({
    product_id: product.product_id,
    categories: get_suggestion_categories(product.categories).sort(),
  })
  const request_key = `${product_key}:${retry_count}`

  useEffect(() => {
    const suggestion_product: ProductSuggestionsProps["product"] = JSON.parse(product_key)
    let is_effect_active = true

    get_product_suggestions(suggestion_product)
      .then((products) => {
        if (is_effect_active) set_suggestion_result({ request_key, products, has_error: false })
      })
      .catch(() => {
        if (is_effect_active) set_suggestion_result({ request_key, products: [], has_error: true })
      })

    return () => { is_effect_active = false }
  }, [product_key, request_key])

  const is_loading = suggestion_result?.request_key !== request_key
  const has_error = !is_loading && suggestion_result.has_error
  const products = !is_loading ? suggestion_result.products : []
  const suggestions_title = <h2 id="product-suggestions-title" className="text-2xl font-semibold">Productos sugeridos</h2>

  return (
    <section aria-labelledby="product-suggestions-title" aria-busy={is_loading} className="mt-10 pt-8 lg:mt-14 lg:pt-10">
      {products.length === 0 && suggestions_title}
      {is_loading ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">Cargando sugerencias…</p>
      ) : has_error ? (
        <div className="mt-4 space-y-3">
          <p role="status" className="text-sm text-muted-foreground">No pudimos cargar las sugerencias.</p>
          <Button type="button" variant="outline" className="cursor-pointer" onClick={() => set_retry_count((previous_count) => previous_count + 1)}>Reintentar</Button>
        </div>
      ) : products.length === 0 ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">No hay sugerencias disponibles por el momento.</p>
      ) : (
        <ProductSuggestionsList key={request_key} products={products} title={suggestions_title} />
      )}
    </section>
  )
}
