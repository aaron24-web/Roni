import { createClient } from '@supabase/supabase-js'

// La URL de tu API de Supabase (¡la que corregimos!)
const supabaseUrl = 'https://REDACTED-OLD-PROJECT.supabase.co'

// La clave ANÓNIMA pública de tu API
const supabaseAnonKey = 'REDACTED-OLD-ANON-KEY'

// Se crea y exporta el cliente de Supabase para usarlo en toda la app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)