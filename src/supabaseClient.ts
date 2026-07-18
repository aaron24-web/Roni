import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/database'

// Las credenciales se leen desde variables de entorno (.env.local).
// Nunca las escribas directamente en el código ni las subas al repositorio.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. Copia .env.example a .env.local y define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
  )
}

// El genérico <Database> hace que cada consulta y RPC se valide contra el
// esquema real: nombres de tabla, columnas y argumentos se autocompletan.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
