import { liteClient as algoliasearch } from "algoliasearch/lite";

//Credenciales para usar el cliente de algoliasearch
const app_id = import.meta.env.VITE_ALGOLIA_APPLICATION_ID;
const search_api_key = import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY;

//Centralización de indices
export const algolia_indices = {
  main: import.meta.env.VITE_ALGOLIA_MAIN_INDEX,
  priceDesc: import.meta.env.VITE_ALGOLIA_PRICE_DESC_INDEX,
  priceAsc: import.meta.env.VITE_ALGOLIA_PRICE_ASC_INDEX,
};

//Validación si falta una variable de entorno
if (!app_id)
  console.error("Variable de entorno faltante: VITE_ALGOLIA_APPLICATION_ID");
if (!search_api_key)
  console.error("Variable de entorno faltante: VITE_ALGOLIA_SEARCH_API_KEY");

//Cliente compartido de algoliasearch para toda la aplicación
export const searchClient = algoliasearch(app_id, search_api_key);
