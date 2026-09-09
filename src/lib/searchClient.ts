import { liteClient as algoliasearch } from "algoliasearch/lite";

const app_id = import.meta.env.VITE_ALGOLIA_APPLICATION_ID;
const search_api_key = import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY;

if (!app_id) console.error("Variable de entorno faltante: VITE_ALGOLIA_APPLICATION_ID");
if (!search_api_key) console.error("Variable de entorno faltante: VITE_ALGOLIA_SEARCH_API_KEY");

export const searchClient = algoliasearch(app_id, search_api_key);
