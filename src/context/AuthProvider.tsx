// src/context/AuthProvider.tsx
//
// Centraliza la sesión de Supabase Auth y el perfil del empleado. Antes esta
// lógica vivía en App.jsx y el `perfil` se pasaba como prop a cada pantalla;
// ahora cualquier componente lo obtiene con useAuth().

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { AuthContext } from './auth-context'
import { esAdministrador } from '../lib/roles'
import type { Perfil } from '../types/domain'

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [perfil, setPerfil] = useState<Perfil | null>(null)
    const [cargando, setCargando] = useState(true)
    const [errorPerfil, setErrorPerfil] = useState<string | null>(null)

    // La sesión se restaura al recargar y se mantiene al día con los cambios.
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session)
            setCargando(false)
        })
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
            setSession(nuevaSesion)
        })
        return () => subscription.unsubscribe()
    }, [])

    // Con sesión activa cargamos el empleado asociado (y su rol).
    useEffect(() => {
        let cancelado = false

        const cargarPerfil = async () => {
            if (!session) {
                setPerfil(null)
                return
            }
            const { data, error } = await supabase.rpc('get_mi_perfil')
            if (cancelado) return

            if (error || !data || data.length === 0) {
                setErrorPerfil('Tu cuenta no tiene un empleado activo asociado. Contacta al administrador.')
                await supabase.auth.signOut()
                setPerfil(null)
                return
            }
            setErrorPerfil(null)
            setPerfil(data[0])
        }

        cargarPerfil()
        return () => { cancelado = true }
    }, [session])

    const cerrarSesion = useCallback(async () => {
        await supabase.auth.signOut()
        setPerfil(null)
    }, [])

    const valor = {
        session,
        perfil,
        cargando,
        errorPerfil,
        esAdmin: esAdministrador(perfil),
        cerrarSesion,
    }

    return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
