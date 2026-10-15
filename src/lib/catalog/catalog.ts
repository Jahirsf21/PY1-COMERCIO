import { algolia_indices, search_client } from "@/lib/algolia/algolia"
import { get_cart_quantity_limits, get_cart_validation_error, validate_cart_item } from "@/lib/cart/cart"
import type { CartItem, CartQuantityLimits, CartValidationResult } from "@/lib/cart/types"
import type { ProductHit, ProductRecord, StockByLocation } from "@/lib/catalog/types"
import { get_suggestions } from "@/lib/shared/suggestions"

/**
 * Obtiene las variantes de un producto desde el índice principal de Algolia.
 * Escapa el product_id para usarlo en el filtro y omite la caché del cliente.
 * No modifica la búsqueda activa del catálogo.
 * @param product_id Identificador del producto cuyas variantes se consultan.
 * @returns Arreglo de variantes con sus tallas y stock por local; vacío si no se proporciona un product_id o no hay coincidencias.
 * @throws Si falla la consulta o la respuesta no contiene un arreglo de hits.
 */
export async function get_product_variants(product_id: string): Promise<ProductHit[]> {
  if (!product_id) return []
  const product_id_filter_value = product_id.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  const { data: { results } } = await search_client.searchWithHTTPInfo<ProductRecord>({
    requests: [{
      indexName: algolia_indices.main,
      query: "",
      filters: `product_id:"${product_id_filter_value}"`,
      distinct: false,
      hitsPerPage: 50,
    }],
  })
  const search_result = results[0]
  if (!search_result || !("hits" in search_result) || !Array.isArray(search_result.hits)) throw new Error("Respuesta de catálogo inválida.")
  return search_result.hits as ProductHit[]
}

/**
 * Consulta hasta 20 productos sugeridos con alguna categoría compartida, sin filtrar por marca.
 * Excluye Hombre, Mujer, Unix y Unisex como criterios, sin descartar productos por su género.
 * Por cada consulta de sugerencias:
 * - Excluye el product_id actual y evita repetir colores del mismo producto.
 * - Conserva únicamente variantes B2C con al menos una talla disponible para comprar.
 * - Reutiliza la consulta, normalización y disponibilidad compartidas con las sugerencias del carrito.
 * Recorre los resultados hasta completar las sugerencias o agotar las coincidencias.
 * No modifica la búsqueda activa del catálogo ni la selección del detalle.
 * @param product Identificador y categorías del producto mostrado en el detalle.
 * @returns Hasta 20 variantes sugeridas; un arreglo vacío si faltan criterios o productos disponibles.
 * @throws Si falla la consulta a Algolia o su respuesta no contiene resultados válidos.
 */
export async function get_product_suggestions(product: Pick<ProductRecord, "product_id" | "categories">): Promise<ProductHit[]> {
  if (typeof product.product_id !== "string" || !product.product_id.trim() || !Array.isArray(product.categories)) return []
  return get_suggestions(product.categories, [product.product_id.trim()])
}

/**
 * Combina las tallas registradas en los locales indicados y elimina duplicados.
 * @param stock_by_location Arreglo de locales con stock por talla dentro de sizes.
 * @returns Lista de tallas sin duplicados; vacía si no hay locales o tallas registradas.
 */
export function get_sizes_from_stock(stock_by_location: StockByLocation[]): string[] {
  return [...new Set(stock_by_location.flatMap((location) => Object.keys(location.sizes)))]
}

/**
 * Suma las unidades disponibles de una talla en todos los locales, descontando reservas.
 * @param stock_by_location Arreglo de locales con stock y reservas por talla.
 * @param selected_size Talla de la que se calcula la disponibilidad.
 * @returns Suma de stock_quantity menos reserved_quantity para la talla; cero si no está registrada.
 */
export function get_available_quantity_by_size(stock_by_location: StockByLocation[], selected_size: string): number {
  return stock_by_location.reduce((available_quantity, location) => {
    const size_stock = location.sizes[selected_size]
    return available_quantity + (size_stock ? size_stock.stock_quantity - size_stock.reserved_quantity : 0)
  }, 0)
}

/**
 * Consulta las reglas y el stock indexados más recientes para una línea SKU+talla.
 * @param product_id Identificador del producto.
 * @param sku Variante seleccionada.
 * @param selected_size Talla cuya disponibilidad se comprueba.
 * @returns Límites vigentes, o null si la variante no está disponible en B2C o sus reglas de cantidad o stock son inválidos.
 * @throws Si falla la consulta de variantes o la respuesta no contiene un arreglo de hits.
 */
export async function get_catalog_quantity_limits(product_id: string, sku: string, selected_size: string): Promise<CartQuantityLimits | null> {
  const variants = await get_product_variants(product_id)
  const variant = variants.find((product) => product.product_id === product_id && product.sku === sku)
  if (!variant || !variant.sales_channels.includes("b2c")) return null
  return get_cart_quantity_limits(variant, get_available_quantity_by_size(variant.b2c_stock_by_location, selected_size))
}

/**
 * Consulta y valida los productos del carrito con los datos actuales del catálogo.
 * Por cada producto:
 * - Consulta sus variantes una vez y reutiliza la respuesta para sus tallas.
 * - Comprueba el canal B2C y el stock y las reservas de la talla seleccionada.
 * - Valida el precio, el descuento y las reglas de cantidad con validate_cart_item().
 * Si una consulta falla, marca sus líneas con error sin borrar productos ni afectar las demás consultas.
 * @param cart Selecciones que requieren renovar sus precios y disponibilidad.
 * @returns Resultado independiente para cada línea, incluso ante fallos parciales.
 *   original_item: referencia de la línea consultada.
 *   item: línea con los datos renovados cuando se pueden comprobar.
 *   status / limits / message: estado, límites y mensaje de validación.
 */
export async function get_cart_validation(cart: CartItem[]): Promise<CartValidationResult[]> {
  const product_ids = [...new Set(cart.map((item) => item.product_id))]
  const variant_responses = await Promise.allSettled(product_ids.map((product_id) => get_product_variants(product_id)))
  const responses_by_product_id = new Map(product_ids.map((product_id, response_index) => [product_id, variant_responses[response_index]]))
  return cart.map((item) => {
    const variant_response = responses_by_product_id.get(item.product_id)
    if (!variant_response || variant_response.status === "rejected") return get_cart_validation_error(item)
    const variant = variant_response.value.find((product) => product?.product_id === item.product_id && product.sku === item.sku)
    if (!variant || !Array.isArray(variant.sales_channels) || !variant.sales_channels.includes("b2c")) {
      return validate_cart_item(item, variant, 0)
    }
    try {
      if (!Array.isArray(variant.b2c_stock_by_location)) return get_cart_validation_error(item)
      for (const location of variant.b2c_stock_by_location) {
        if (!location || !location.sizes || typeof location.sizes !== "object" || Array.isArray(location.sizes)) return get_cart_validation_error(item)
        const size_stock = location.sizes[item.selected_size]
        if (size_stock !== undefined && (!size_stock || !Number.isSafeInteger(size_stock.stock_quantity) || !Number.isSafeInteger(size_stock.reserved_quantity) || size_stock.stock_quantity < 0 || size_stock.reserved_quantity < 0 || size_stock.reserved_quantity > size_stock.stock_quantity)) return get_cart_validation_error(item)
      }
      return validate_cart_item(item, variant, get_available_quantity_by_size(variant.b2c_stock_by_location, item.selected_size))
    } catch {
      return get_cart_validation_error(item)
    }
  })
}
