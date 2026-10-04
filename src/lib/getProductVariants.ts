import { algolia_indices, searchClient } from "@/lib/searchClient"
import type { ProductHit, ProductRecord } from "@/lib/types/product"

/**
 * Obtiene las variantes de color de un producto bajo product_id.
 *
 * Cada registro contiene sus tallas y el stock por talla dentro de cada local.
 * La consulta no modifica el estado de búsqueda del catálogo.
 * Omite la caché del cliente para consultar el stock indexado más reciente.
 *
 * @param productId
 * @returns La lista de variantes de color del producto
 */
export async function getProductVariants(productId: string): Promise<ProductHit[]> {
  if (!productId) return [];

  const { results } = await searchClient.search<ProductRecord>({
    requests: [{
      indexName: algolia_indices.main,
      query: "",
      filters: `product_id:"${productId}"`,
      distinct: false,
      hitsPerPage: 50,
    }],
  }, { cacheable: false });

  const result = results[0];
  return "hits" in result ? result.hits as ProductHit[] : [];
}
