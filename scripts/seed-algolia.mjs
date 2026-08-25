import "dotenv/config"
import { algoliasearch } from "algoliasearch";
import { readFile } from "node:fs/promises";

const app_id = process.env.VITE_ALGOLIA_APPLICATION_ID
const admin_api_key = process.env.VITE_ALGOLIA_ADMIN_API_KEY
if (!app_id) console.error("Variable de entorno faltante: VITE_ALGOLIA_APPLICATION_ID")
if (!admin_api_key) console.error("Variable de entorno faltante: VITE_ALGOLIA_ADMIN_API_KEY")

const index_name = "grupo-04_products"
const client = algoliasearch(app_id, admin_api_key);

/**
 * A partir de un arreglo de stock por sitio, calcula la cantidad disponible (stock_quantity - reserved_quantity) por cada sitio y los totales agregados.
 * @param {Array<Omit<StockBySite, "available_quantity">>} stock_by_site Arreglo de stock por provincia/sitio sin available_quantity
 * @returns {{updated_sites: StockBySite[], stock_quantity: number, reserved_quantity: number, available_quantity: number}}
 *   updated_sites: el mismo arreglo con available_quantity calculado por sitio.
 *   stock_quantity / reserved_quantity / available_quantity: totales agregados de todos los sitios.
 *   Si stock_by_site no es un arreglo válido o está vacío, retorna todo en cero.
 */
function process_stock_by_site(stock_by_site) {
  if (!Array.isArray(stock_by_site) || stock_by_site.length === 0) {
    return { updated_sites: [], stock_quantity: 0, reserved_quantity: 0, available_quantity: 0 }
  }
  const updated_sites = stock_by_site.map((site) => ({
    ...site,
    available_quantity: site.stock_quantity - site.reserved_quantity
  }))
  const totals = updated_sites.reduce((acc, site) => ({
    stock_quantity: acc.stock_quantity + site.stock_quantity,
    reserved_quantity: acc.reserved_quantity + site.reserved_quantity,
    available_quantity: acc.available_quantity + site.available_quantity
  }),
    { stock_quantity: 0, reserved_quantity: 0, available_quantity: 0}
  )
  return { updated_sites, ...totals}
}

/**
 * Obtiene la lista de provincias sin duplicados que tienen stock disponible
 * (stock_quantity mayor a 0), combinando uno o varios arreglos de stock por
 * sitio (ej. b2c y b2b).
 * @param {...StockBySite[]} stock_arrays
 * @returns {string[]} Lista de provincias (site_province) sin duplicados con stock disponible.
 */
function get_provinces_with_stock(...stock_arrays) {
  const sites = new Set()
  for (const arr of stock_arrays) {
    if (!Array.isArray(arr)) continue
    for (const site of arr) {
      if (site.stock_quantity> 0) sites.add(site.site_province)
    }
  }
  return [...sites]
}

/**
 * Determina si un descuento está actualmente vigente según su rango de fechas (starts_at / ends_at).
 * @param {Discount} {percentage, starts_at, ends_at}
 * @returns {boolean} true si la fecha actual está dentro del rango del descuento.
 */
function is_currently_on_discount(discount) {
  if (!discount) return false
  const now = Date.now()
  return discount.starts_at <= now && discount.ends_at >= now
}

/**
 * Lee y parsea el archivo JSON con los records a indexar.
 * Por cada record:
 * - Si no tiene objectID, se le asigna el sku como identificador.
 * - Calcula el stock por sitio (b2c y b2b) con sus cantidades disponibles, reservadas y totales.
 * - Pone en cero los campos de precio/stock/ del canal (b2b o b2c) que el producto no vende.
 * - Calcula total_stock_quantity, in_stock_b2c, in_stock_b2b, site_provinces y on_discount.
 * @returns {Promise<ProductRecord[]>} Arreglo de records
 * @throws {Error} Si el archivo no contiene un array válido.
 */
async function get_records() {
  const content = await readFile("data/records.json", "utf-8")
  const records = JSON.parse(content)
  if (!Array.isArray(records)) {
    throw new Error("El JSON debe ser un array de objetos")
  }
  records.forEach((record, index) => {
    if (!record.objectID) {
      record.objectID = record.sku
    }
    record.image_url = record.images_url[0]
    const b2c = process_stock_by_site(record.b2c_stock_by_site)
    record.b2c_stock_by_site = b2c.updated_sites
    record.b2c_stock_quantity = b2c.stock_quantity
    record.b2c_reserved_quantity = b2c.reserved_quantity
    record.b2c_available_quantity = b2c.available_quantity
    const b2b = process_stock_by_site(record.b2b_stock_by_site)
    record.b2b_stock_by_site = b2b.updated_sites
    record.b2b_stock_quantity = b2b.stock_quantity
    record.b2b_reserved_quantity = b2b.reserved_quantity
    record.b2b_available_quantity = b2b.available_quantity
    if (!record.sales_channels.includes("b2b")) {
      record.b2b_price = 0;
      record.b2b_stock_quantity = 0;
      record.b2b_reserved_quantity = 0;
      record.b2b_available_quantity = 0;
      record.b2b_min_order_quantity = 0;
      record.b2b_max_order_quantity = 0;
      record.b2b_step_quantity = 0;
      record.b2b_stock_by_site = [];
    }
    if (!record.sales_channels.includes("b2c")) {
      record.b2c_price = 0;
      record.b2c_stock_quantity = 0;
      record.b2c_reserved_quantity = 0;
      record.b2c_available_quantity = 0;
      record.b2c_min_order_quantity = 0;
      record.b2c_max_order_quantity = 0;
      record.b2c_step_quantity = 0;
      record.b2c_stock_by_site = [];
    }
    record.total_stock_quantity = record.b2c_stock_quantity + record.b2b_stock_quantity
    record.in_stock_b2c = record.b2c_stock_quantity > 0
    record.in_stock_b2b = record.b2b_stock_quantity > 0
    record.site_provinces = get_provinces_with_stock(record.b2c_stock_by_site, record.b2b_stock_by_site)
    record.on_discount = is_currently_on_discount(record.b2c_discount)
  });
  return records;
}

/**
 * Obtiene los records de get_records() y los sube al índice de Algolia definido en index_name.
 * @returns {Promise<void>}
 */
async function seed_algolia() {
  const records = await get_records();
  const { taskID } = await client.saveObjects({
    indexName: index_name,
    objects: records,
  })
}

/**
 * Ejecuta el seed y maneja errores
 */
seed_algolia().catch((Error) => {
  console.error("Error al poblar el indice:", Error);
  process.exit(1);
});
