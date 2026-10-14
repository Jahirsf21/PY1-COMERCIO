import { algolia_indices, searchClient } from "@/lib/algolia/algolia"
import { get_cart_quantity_limits } from "@/lib/cart/cart"
import type { CartQuantityLimits } from "@/lib/cart/types"
import type { ProductHit, ProductRecord, StockByLocation } from "@/lib/catalog/types"

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

/**
 * Combina las tallas registradas en los locales indicados y elimina duplicados.
 * @param locations Locales cuyo inventario se consulta.
 */
export function getSizesFromStock(locations: StockByLocation[]): string[] {
  return [...new Set(locations.flatMap((location) => Object.keys(location.sizes)))]
}

/**
 * Suma las unidades disponibles de una talla en todos los locales, descontando reservas.
 * @param locations Locales cuyo inventario se consulta.
 * @param size Talla de la que se calcula la disponibilidad.
 */
export function getAvailableQuantityBySize(locations: StockByLocation[], size: string): number {
  return locations.reduce((total, location) => {
    const stock = location.sizes[size]
    return total + (stock ? stock.stock_quantity - stock.reserved_quantity : 0)
  }, 0)
}

/** Consulta las reglas y el stock indexados más recientes para una línea SKU+talla. */
export async function getCartQuantityLimits(product_id: string, sku: string, selected_size: string): Promise<CartQuantityLimits | null> {
  const variants = await getProductVariants(product_id)
  const variant = variants.find((product) => product.sku === sku)
  if (!variant || !variant.sales_channels.includes("b2c")) return null
  return get_cart_quantity_limits(variant, getAvailableQuantityBySize(variant.b2c_stock_by_location, selected_size))
}
