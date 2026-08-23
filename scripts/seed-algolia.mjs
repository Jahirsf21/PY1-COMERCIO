import "dotenv/config"
import { algoliasearch } from "algoliasearch";
import { readFile } from "node:fs/promises";

const appID = process.env.VITE_ALGOLIA_APPLICATION_ID
const adminApiKey = process.env.VITE_ALGOLIA_ADMIN_API_KEY
const indexName = "grupo-04_products"

const client = algoliasearch(appID, adminApiKey);

/**
 * Lee y parsea el archivo JSON con los records a indexar
 * Si el record no tiene objectID automaticamente se le asigna uno
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
      record.objectID = `PR${index}`;
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
    indexName: indexName,
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
