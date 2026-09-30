import type { StockByLocation } from "@/lib/types/product"

/**
 * Obtiene las tallas registradas en los locales indicados.
 *
 * Combina las tallas de todos los locales y elimina los duplicados.
 *
 * @param locations Locales cuyo inventario se consulta
 * @returns La lista de tallas presentes en esos locales
 */
export function getSizesFromStock(locations: StockByLocation[]): string[] {
  return [...new Set(locations.flatMap((location) => Object.keys(location.sizes)))]
}

/**
 * Suma las unidades disponibles de una talla en los locales indicados.
 *
 * Descuenta las unidades reservadas del stock de cada local.
 *
 * @param locations Locales cuyo inventario se consulta
 * @param size Talla de la que se calcula la disponibilidad
 * @returns La cantidad total disponible para esa talla
 */
export function getAvailableQuantityBySize(locations: StockByLocation[], size: string): number {
  return locations.reduce((total, location) => {
    const stock = location.sizes[size]
    return total + (stock ? stock.stock_quantity - stock.reserved_quantity : 0)
  }, 0)
}
