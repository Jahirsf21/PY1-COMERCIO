import { createClient } from '@supabase/supabase-js';
const supabase_url = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabase_key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!supabase_url) {
  throw new Error('Falta VITE_SUPABASE_URL. Configúrala en el archivo .env.');
}

if (!supabase_key) {
  throw new Error('Falta VITE_SUPABASE_PUBLISHABLE_KEY. Configúrala en el archivo .env.');
}

if (supabase_key.startsWith('sb_secret_')) {
  throw new Error('Utiliza una clave publicable de Supabase, no una clave secreta, en el navegador.');
}

/**
 * Cliente compartido del servicio de Supabase para las operaciones en el navegador.
 */
export const supabase = createClient(supabase_url, supabase_key);
