import { createClient } from '@supabase/supabase-js'

// Las credenciales se leen desde variables de entorno (.env.local).
// Nunca las escribas directamente en el código ni las subas al repositorio.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. Copia .env.example a .env.local y define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
  )
}

// Se crea y exporta el cliente de Supabase para usarlo en toda la app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
