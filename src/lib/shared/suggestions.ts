import { algolia_indices, search_client } from "@/lib/algolia/algolia"
import type { ProductHit, ProductRecord } from "@/lib/catalog/types"
import { get_suggestion_categories, is_product_suggestion_available } from "@/lib/shared/utils"

/**
 * Consulta hasta 20 productos sugeridos con la lógica compartida de carrito y detalle.
 * Busca coincidencias en cualquiera de las categorías permitidas, sin filtrar por marca.
 * Excluye los product_id recibidos y evita repetir colores del mismo producto.
 * Conserva únicamente variantes B2C con al menos una talla disponible para comprar.
 * Recorre los resultados hasta completar las sugerencias o agotar las coincidencias.
 * No modifica la búsqueda activa del catálogo ni las selecciones de compra.
 * @param category_names Categorías de los productos que originan las sugerencias.
 * @param product_ids Identificadores de los productos que no deben aparecer como sugerencias.
 * @returns Hasta 20 variantes sugeridas; un arreglo vacío si no hay categorías permitidas o productos disponibles.
 * @throws Si falla una consulta a Algolia o su respuesta no contiene resultados válidos.
 */
export async function get_suggestions(category_names: string[], product_ids: string[]): Promise<ProductHit[]> {
  const categories = get_suggestion_categories(category_names)
  if (categories.length === 0) return []
  const category_filters = categories.map((category_name) => `categories:${JSON.stringify(category_name)}`)
  const excluded_product_ids = new Set(product_ids)
  const excluded_product_filters = [...excluded_product_ids].map((product_id) => `NOT product_id:${JSON.stringify(product_id)}`)
  const suggestion_filters = [
    `(${category_filters.join(" OR ")})`,
    ...excluded_product_filters,
  ].join(" AND ")
  const matching_categories = new Set(categories.map((category_name) => category_name.toLocaleLowerCase("es")))
  const suggested_product_ids = new Set<string>()
  const suggested_products: ProductHit[] = []
  const suggestion_limit = 20
  let current_page = 0
  let total_pages = 1
  while (current_page < total_pages && suggested_products.length < suggestion_limit) {
    const { data: { results } } = await search_client.searchWithHTTPInfo<ProductRecord>({
      requests: [{
        indexName: algolia_indices.main,
        query: "",
        filters: suggestion_filters,
        hitsPerPage: 20,
        page: current_page,
        distinct: false,
      }],
    })
    const suggestion_result = results[0]
    if (!suggestion_result || !("hits" in suggestion_result) || !Array.isArray(suggestion_result.hits) || typeof suggestion_result.nbPages !== "number" || !Number.isSafeInteger(suggestion_result.nbPages) || suggestion_result.nbPages < 0) throw new Error("Respuesta de sugerencias inválida.")
    total_pages = suggestion_result.nbPages
    current_page += 1
    for (const product of suggestion_result.hits as ProductHit[]) {
      if (!product || typeof product.product_id !== "string" || !product.product_id.trim() || !Array.isArray(product.categories) || excluded_product_ids.has(product.product_id) || suggested_product_ids.has(product.product_id)) continue
      const has_matching_category = get_suggestion_categories(product.categories).some((category_name) => matching_categories.has(category_name.toLocaleLowerCase("es")))
      if (!has_matching_category || !is_product_suggestion_available(product)) continue
      suggested_product_ids.add(product.product_id)
      suggested_products.push(product)
      if (suggested_products.length === suggestion_limit) break
    }
  }
  return suggested_products
}
