// Traducción de errores técnicos (Postgres / Supabase / red) a mensajes
// claros en español para el usuario.
//
// Uso en los hooks de datos:
//   if (error) throw traducirError(error)
//   if (error) throw traducirError(error, { enUso: 'hay productos que usan este departamento' })
//
// El detalle técnico nunca se pierde: se manda a console.error para depurar.

interface ErrorTecnico {
    message: string
    code?: string
    details?: string | null
    hint?: string | null
}

export interface ContextoError {
    /** Mensaje para el caso "registro en uso" (violación de llave foránea). */
    enUso?: string
    /** Mensaje para el caso "ya existe" (violación de unicidad). */
    duplicado?: string
}

/** Restricciones de la base con mensaje propio (CHECK y UNIQUE conocidas). */
const RESTRICCIONES_CONOCIDAS: Record<string, string> = {
    chk_rfc_formato: 'El formato del RFC introducido no es válido.',
    chk_telefono_numerico: 'El formato del teléfono no es válido. Ingresa solo números (10-15 dígitos).',
    clientes_rfc_key: 'El RFC introducido ya está registrado para otro cliente.',
}

/** Convierte un error técnico en un Error con mensaje pensado para el usuario. */
export function traducirError(error: ErrorTecnico, contexto: ContextoError = {}): Error {
    // Conserva el error original en la consola para diagnóstico.
    console.error('[supabase]', error)

    const mensaje = error.message ?? ''
    const codigo = error.code

    // Restricciones CHECK con traducción propia (p. ej. formato de RFC).
    for (const [restriccion, texto] of Object.entries(RESTRICCIONES_CONOCIDAS)) {
        if (mensaje.includes(restriccion)) return new Error(texto)
    }

    // RAISE EXCEPTION de nuestras funciones RPC (código P0001): esos mensajes
    // ya están escritos para el usuario (p. ej. "Stock insuficiente"), pasan tal cual.
    if (codigo === 'P0001') return new Error(mensaje)

    // Registro en uso por otros datos (llave foránea).
    if (codigo === '23503' || mensaje.includes('violates foreign key constraint')) {
        return new Error(
            contexto.enUso
                ? `No se puede completar la operación: ${contexto.enUso}.`
                : 'No se puede completar la operación: el registro está en uso por otros datos.'
        )
    }

    // Valor duplicado (restricción de unicidad).
    if (codigo === '23505' || mensaje.includes('duplicate key value')) {
        return new Error(contexto.duplicado ?? 'Ya existe un registro con esos datos.')
    }

    // Sin permisos (RLS / privilegios).
    if (
        codigo === '42501' ||
        mensaje.includes('row-level security') ||
        mensaje.includes('permission denied')
    ) {
        return new Error('No tienes permisos para realizar esta acción.')
    }

    // Problemas de red.
    if (/fetch|network/i.test(mensaje)) {
        return new Error('Sin conexión con el servidor. Revisa tu conexión a internet.')
    }

    // Cualquier otro error técnico: mensaje genérico (el detalle quedó en consola).
    return new Error('Ocurrió un error inesperado. Inténtalo de nuevo.')
}
