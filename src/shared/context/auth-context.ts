// Contexto de sesión y hook de acceso. Van en un módulo aparte del provider
// para no romper Fast Refresh (un archivo de componentes solo exporta componentes).

import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Perfil } from '../types/domain'

export interface AuthContextValor {
    /** Sesión de Supabase Auth (null si no ha iniciado sesión) */
    session: Session | null
    /** Empleado con sesión iniciada, con su rol */
    perfil: Perfil | null
    /** true mientras se restaura la sesión al cargar la app */
    cargando: boolean
    /** Mensaje si la cuenta autenticada no tiene empleado activo asociado */
    errorPerfil: string | null
    /** true si el perfil tiene rol Administrador */
    esAdmin: boolean
    cerrarSesion: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValor | null>(null)

export function useAuth(): AuthContextValor {
    const contexto = useContext(AuthContext)
    if (!contexto) {
        throw new Error('useAuth debe usarse dentro de <AuthProvider>')
    }
    return contexto
}
