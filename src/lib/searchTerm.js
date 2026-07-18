// Sanitiza un término de búsqueda antes de interpolarlo en un filtro PostgREST
// (`.or(...)`, `.filter(...)`). Elimina los caracteres que tienen significado
// especial en la gramática de filtros de PostgREST/Supabase —comas, paréntesis,
// comillas, backslash y comodines `%` `_`— para evitar que un usuario pueda
// romper el filtro o inyectar condiciones adicionales.
export function sanitizeSearchTerm(input) {
  if (typeof input !== 'string') return ''
  return input
    .replace(/[,()"'\\%_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
