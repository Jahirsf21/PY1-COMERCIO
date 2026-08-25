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
 * Lee y parsea el archivo JSON con los records a indexar
 * Si el record no tiene objectID automaticamente se le asigna uno
 * Asigna automaticamente la cantidad disponible de productos segun el canal de venta
 * @returns Array de records
 * @throws {Error} Si el archivo no contiene un array válido
 */
async function get_records() {
  const content = await readFile("data/records.json", "utf-8")
  const records = JSON.parse(content)
  if (!Array.isArray(records)) {
    throw new Error("El JSON debe ser un array de objetos")
  }
  records.forEach((record, index) => {
    if (!record.objectID) {
      record.objectID = `PRODUCT${index}`;
    }
    record.b2c_available_quantity = record.b2c_stock_quantity - record.b2c_reserved_quantity
    record.b2b_available_quantity = record.b2b_stock_quantity - record.b2b_reserved_quantity
    if (!record.sales_channels.includes("b2b")) {
      record.b2b_price = 0;
      record.b2b_stock_quantity = 0;
      record.b2b_reserved_quantity = 0;
      record.b2b_available_quantity = 0;
      record.b2b_min_order_quantity = 0;
      record.b2b_max_order_quantity = 0;
      record.b2b_step_quantity = 0;  
    }
    if (!record.sales_channels.includes("b2c")) {
      record.b2c_price = 0;
      record.b2c_stock_quantity = 0;
      record.b2c_reserved_quantity = 0;
      record.b2c_available_quantity = 0;
      record.b2c_min_order_quantity = 0;
      record.b2c_max_order_quantity = 0;
      record.b2c_step_quantity = 0; 
    }
  });
  return records;
}

/**
 * Sube los records al índice de Algolia
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
