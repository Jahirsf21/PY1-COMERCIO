import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CartQuantityLimits } from "@/lib/cart/types"
import type { ProductRecord } from "@/lib/catalog/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un importe con la moneda indicada y dos decimales.
 * @param amount Importe que se mostrará.
 * @param currency Código de moneda del importe.
 * @returns Importe formateado con su símbolo de moneda y dos decimales.
 * @throws Si el código de moneda no tiene un formato admitido por Intl.NumberFormat.
 */
export function format_price(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Obtiene las categorías que se pueden utilizar para sugerir productos.
 * Elimina espacios externos y duplicados, sin distinguir mayúsculas y minúsculas.
 * Excluye Hombre, Mujer, Unix y Unisex como criterios de coincidencia, no los productos que contienen esas categorías.
 * @param category_names Categorías recuperadas desde el catálogo.
 * @returns Categorías sin duplicados y sin las categorías de género excluidas.
 */
export function get_suggestion_categories(category_names: string[]): string[] {
  const excluded_categories = new Set(["hombre", "mujer", "unix", "unisex"])
  const categories_by_name = new Map<string, string>()
  for (const category_name of category_names) {
    if (typeof category_name !== "string") continue
    const trimmed_category = category_name.trim()
    if (!trimmed_category) continue
    const category_key = trimmed_category.toLocaleLowerCase("es")
    if (!excluded_categories.has(category_key) && !categories_by_name.has(category_key)) {
      categories_by_name.set(category_key, trimmed_category)
    }
  }
  return [...categories_by_name.values()]
}

/**
 * Combina las reglas B2C con el stock de una talla. El máximo se redondea hacia
 * abajo a una cantidad válida; cero indica que ni siquiera se alcanza el mínimo.
 * Una configuración incompleta o inválida se rechaza, sin asumir valores por defecto.
 * @param product Reglas comerciales B2C del producto.
 * @param available_quantity Unidades disponibles de la talla seleccionada.
 * @returns Límites ajustados al stock y al paso, o null si los datos son inválidos.
 */
export function get_product_quantity_limits(product: Pick<ProductRecord, "b2c_min_order_quantity" | "b2c_max_order_quantity" | "b2c_step_quantity">, available_quantity: number): CartQuantityLimits | null {
  const { b2c_min_order_quantity: min_quantity, b2c_max_order_quantity, b2c_step_quantity: step_quantity } = product
  if (![min_quantity, b2c_max_order_quantity, step_quantity].every((rule_quantity) => Number.isSafeInteger(rule_quantity) && rule_quantity > 0)) return null
  if (b2c_max_order_quantity < min_quantity || !Number.isSafeInteger(available_quantity) || available_quantity < 0) return null
  const quantity_cap = Math.min(b2c_max_order_quantity, available_quantity)
  const max_quantity = quantity_cap < min_quantity ? 0 : min_quantity + Math.floor((quantity_cap - min_quantity) / step_quantity) * step_quantity
  return { min_quantity, max_quantity, step_quantity }
}

/**
 * Comprueba que una sugerencia se venda en B2C y tenga una talla con stock suficiente.
 * Suma las unidades de cada talla entre los locales, descontando las reservas.
 * Rechaza inventarios inconsistentes y respeta el mínimo, máximo y paso de compra.
 * @param product Variante candidata a mostrarse como sugerencia.
 * @returns true si al menos una talla permite realizar una compra con sus reglas actuales.
 */
export function is_product_suggestion_available(product: ProductRecord): boolean {
  if (!Array.isArray(product.sales_channels) || !product.sales_channels.includes("b2c") || !Array.isArray(product.b2c_stock_by_location)) return false
  const available_by_size = new Map<string, number>()
  for (const location of product.b2c_stock_by_location) {
    if (!location || !location.sizes || typeof location.sizes !== "object" || Array.isArray(location.sizes)) return false
    for (const [size, size_stock] of Object.entries(location.sizes)) {
      if (!size_stock || !Number.isSafeInteger(size_stock.stock_quantity) || !Number.isSafeInteger(size_stock.reserved_quantity) || size_stock.stock_quantity < 0 || size_stock.reserved_quantity < 0 || size_stock.reserved_quantity > size_stock.stock_quantity) return false
      const available_quantity = size_stock.stock_quantity - size_stock.reserved_quantity
      available_by_size.set(size, (available_by_size.get(size) ?? 0) + available_quantity)
    }
  }
  return [...available_by_size.values()].some((available_quantity) => {
    const limits = get_product_quantity_limits(product, available_quantity)
    return limits !== null && limits.max_quantity >= limits.min_quantity
  })
}
