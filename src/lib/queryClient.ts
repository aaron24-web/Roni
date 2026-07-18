import { QueryClient } from '@tanstack/react-query'

// Cliente de React Query para toda la app. Sustituirá los useEffect+useState
// que hoy repiten cada pantalla para leer de Supabase.
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Los datos de catálogo (productos, clientes...) no cambian a cada
            // segundo: evitamos recargas innecesarias entre navegaciones.
            staleTime: 30_000,
            // En un POS, recargar al volver a la ventana es más molesto que útil.
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
})
