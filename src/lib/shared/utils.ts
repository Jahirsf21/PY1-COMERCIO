import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CartQuantityLimits } from "@/lib/cart/types"
import type { ProductImage, ProductRecord } from "@/lib/catalog/types"
import type { StoredJsonResult } from "@/lib/shared/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Comprueba que un valor sea un objeto, sin aceptar arreglos ni null.
 * @param value Valor que se desea comprobar.
 * @returns true si el valor es un objeto.
 */
export function is_record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

/**
 * Comprueba que un valor sea una cadena con contenido después de quitar los espacios externos.
 * @param value Valor que se desea comprobar.
 * @returns true si el valor es una cadena no vacía.
 */
export function is_nonempty_string(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

/**
 * Comprueba que un valor sea un entero seguro mayor que cero.
 * @param value Valor que se desea comprobar.
 * @returns true si el valor es un entero positivo.
 */
export function is_positive_integer(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
}

/**
 * Comprueba que un valor sea un código de moneda de tres letras mayúsculas.
 * @param value Valor que se desea comprobar.
 * @returns true si el código tiene el formato esperado.
 */
export function is_valid_currency(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value)
}

/**
 * Comprueba que un precio sea finito, no negativo y que su subtotal en centavos sea un entero seguro.
 * @param value Precio que se desea comprobar.
 * @param quantity Cantidad con la que se calcula el subtotal; por defecto, 1.
 * @returns true si el precio es válido.
 */
export function is_valid_price(value: unknown, quantity = 1): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * quantity * 100))
}

/**
 * Comprueba que una imagen tenga una URL HTTP, HTTPS o relativa sin credenciales y un texto alternativo.
 * @param value Imagen que se desea comprobar.
 * @returns true si la imagen es válida.
 */
export function is_valid_image(value: unknown): value is ProductImage {
  if (!is_record(value) || !is_nonempty_string(value.url) || typeof value.alt !== "string") return false
  try {
    const image_url = new URL(value.url.trim(), "https://shop.invalid/")
    return (image_url.protocol === "https:" || image_url.protocol === "http:") && !image_url.username && !image_url.password
  } catch {
    return false
  }
}

/**
 * Obtiene y convierte un JSON guardado en localStorage.
 * @param storage_key Clave de localStorage.
 * @returns Resultado de la lectura.
 *   status: ok si se convirtió el contenido; empty si la clave no existe; invalid_json si el contenido no es un JSON válido; storage_error si el navegador impide leer localStorage.
 *   data: contenido convertido, solo cuando status es ok.
 */
export function get_stored_json(storage_key: string): StoredJsonResult {
  let stored_json: string | null
  try {
    stored_json = window.localStorage.getItem(storage_key)
  } catch {
    return { status: "storage_error" }
  }
  if (stored_json === null) return { status: "empty" }
  try {
    return { status: "ok", data: JSON.parse(stored_json) }
  } catch {
    return { status: "invalid_json" }
  }
}

/**
 * Guarda una lista en localStorage, o elimina la clave si la lista está vacía.
 * @param storage_key Clave de localStorage.
 * @param items Elementos que se desean guardar.
 * @returns true si se guardó; false si el navegador rechaza la operación.
 */
export function save_stored_list(storage_key: string, items: unknown[]): boolean {
  try {
    if (items.length === 0) window.localStorage.removeItem(storage_key)
    else window.localStorage.setItem(storage_key, JSON.stringify(items))
    return true
  } catch {
    return false
  }
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
 * Obtiene las categorías que se usan para sugerir productos.
 * Quita los espacios externos y elimina los duplicados sin distinguir mayúsculas, junto con las categorías Hombre, Mujer, Unix y Unisex.
 * @param category_names Categorías del catálogo.
 * @returns Categorías sin duplicados y sin las categorías de género.
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
 * Calcula los límites de cantidad de una talla con las reglas B2C del producto y el stock disponible.
 * El máximo es la mayor cantidad válida según el paso que no supera el máximo B2C ni el stock; es cero si el stock no alcanza el mínimo.
 * @param product Reglas de cantidad B2C del producto.
 * @param available_quantity Stock disponible de la talla.
 * @returns Límites de cantidad, o null si las reglas o el stock son inválidos.
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
 * Comprueba si un producto se vende en B2C y tiene al menos una talla con stock suficiente para comprarlo.
 * Suma el stock disponible de cada talla en todos los locales y calcula sus límites con get_product_quantity_limits().
 * @param product Variante candidata a sugerencia.
 * @returns true si al menos una talla permite una compra; false si no se vende en B2C o el stock es inconsistente.
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
