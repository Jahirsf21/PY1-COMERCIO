import { useEffect, useState } from "react"
import { ProductSuggestionsList } from "@/components/product-suggestions-list"
import { Button } from "@/components/ui/button"
import { get_cart_suggestions } from "@/lib/cart/cart"
import { useCart } from "@/lib/cart/cartContext"
import type { CartSuggestionsResult } from "@/lib/cart/types"

/**
 * Muestra hasta 20 productos sugeridos según las categorías del carrito, en grupos de 4.
 * Consulta las sugerencias con get_cart_suggestions() cuando cambian los productos del carrito y permite reintentar si falla la consulta.
 * @returns Sección de sugerencias con sus estados de carga, error y sin resultados.
 */
export function CartSuggestions() {
  const { cart } = useCart()
  const [retry_count, set_retry_count] = useState(0)
  const [suggestion_result, set_suggestion_result] = useState<CartSuggestionsResult | null>(null)
  const product_ids_key = JSON.stringify([...new Set(cart.map((item) => item.product_id))].sort())
  const request_key = `${product_ids_key}:${retry_count}`

  useEffect(() => {
    const product_ids: string[] = JSON.parse(product_ids_key)
    if (product_ids.length === 0) return
    let is_effect_active = true

    get_cart_suggestions(product_ids)
      .then((products) => {
        if (is_effect_active) set_suggestion_result({ request_key, products, has_error: false })
      })
      .catch(() => {
        if (is_effect_active) set_suggestion_result({ request_key, products: [], has_error: true })
      })

    return () => { is_effect_active = false }
  }, [product_ids_key, request_key])

  const is_loading = suggestion_result?.request_key !== request_key
  const has_error = !is_loading && suggestion_result.has_error
  const products = !is_loading ? suggestion_result.products : []
  const suggestions_title = <h2 id="cart-suggestions-title" className="text-xl font-semibold">Productos sugeridos</h2>

  return (
    <section aria-labelledby="cart-suggestions-title" aria-busy={is_loading} className="mt-6">
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
