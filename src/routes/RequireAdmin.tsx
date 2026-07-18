// src/routes/RequireAdmin.tsx
//
// Guard de ruta: solo permite el paso a administradores. Complementa (no
// sustituye) la autorización del servidor, que es la que realmente manda.

import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/auth-context'

export default function RequireAdmin({ children }: { children: ReactNode }) {
    const { esAdmin } = useAuth()
    if (!esAdmin) {
        return <Navigate to="/ventas" replace />
    }
    return children
}
