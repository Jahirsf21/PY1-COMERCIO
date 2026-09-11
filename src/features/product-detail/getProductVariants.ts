import { algolia_indices, searchClient } from "@/lib/searchClient";
import type { ProductHit, ProductRecord } from "@/features/catalog/types";


/**
 * Obtiene todas las variantes de un producto bajo product_id
 *
 * Se usa searchCliente.search ya que no una consulta para afectar el estado de busqueda sino,
 * para traer los datos y que puedan ser utilizados en el detalle de producto
 *
 * @param productId
 * @returns La lista de variantes del producto
 */
export async function getProductVariants(productId: string) {
  const { results } = await searchClient.search<ProductRecord>({
    requests: [{
      indexName: algolia_indices.main,
      query: "",
      filters: `product_id:"${productId}"`,
      distinct: false,
      hitsPerPage: 50,
    }],
  });

  const result = results[0];
  return "hits" in result ? result.hits as ProductHit[] : [];
}
