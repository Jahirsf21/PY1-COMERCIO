import { liteClient as algoliasearch } from "algoliasearch/lite"

const app_id = import.meta.env.VITE_ALGOLIA_APPLICATION_ID;
const search_api_key = import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY;

/**
 * Índices de Algolia para la búsqueda principal y el ordenamiento por precio.
 */
export const algolia_indices = {
  main: import.meta.env.VITE_ALGOLIA_MAIN_INDEX,
  priceDesc: import.meta.env.VITE_ALGOLIA_PRICE_DESC_INDEX,
  priceAsc: import.meta.env.VITE_ALGOLIA_PRICE_ASC_INDEX,
};

if (!app_id)
  console.error("Variable de entorno faltante: VITE_ALGOLIA_APPLICATION_ID");
if (!search_api_key)
  console.error("Variable de entorno faltante: VITE_ALGOLIA_SEARCH_API_KEY");

/**
 * Cliente compartido de Algolia para consultar el catálogo con la clave de búsqueda.
 */
export const search_client = algoliasearch(app_id, search_api_key);
