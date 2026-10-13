import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!supabaseUrl) {
  throw new Error('Falta VITE_SUPABASE_URL. Configúrala en el archivo .env.');
}

if (!supabaseKey) {
  throw new Error('Falta VITE_SUPABASE_PUBLISHABLE_KEY. Configúrala en el archivo .env.');
}

if (supabaseKey.startsWith('sb_secret_')) {
  throw new Error('Utiliza una clave publicable de Supabase, no una clave secreta, en el navegador.');
}

/**
 * Cliente compartido de Supabase para las operaciones de la aplicación en el navegador.
 */
export const supabase = createClient(supabaseUrl, supabaseKey);