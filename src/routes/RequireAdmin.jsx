// src/routes/RequireAdmin.jsx
//
// Guard de ruta: solo permite el paso a administradores. Complementa (no
// sustituye) la autorización del servidor, que es la que realmente manda.

import { Navigate } from 'react-router-dom';
import { esAdministrador } from '../lib/roles';

export default function RequireAdmin({ perfil, children }) {
    if (!esAdministrador(perfil)) {
        return <Navigate to="/ventas" replace />;
    }
    return children;
}
