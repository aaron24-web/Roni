// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import PosProvider from './shared/context/PosProvider'
import { useAuth } from './shared/context/auth-context'
import RequireAdmin from './shared/routes/RequireAdmin'
import Layout from './shared/components/Layout'
import LoginPage from './features/auth/LoginPage'
import VentasPage from './features/ventas/VentasPage'
import EmpleadosPage from './features/empleados/EmpleadosPage'
import ProductosPage from './features/productos/ProductosPage'
import DepartamentosPage from './features/departamentos/DepartamentosPage'
import ClientesPage from './features/clientes/ClientesPage'
import CajaPage from './features/caja/CajaPage'
import ReportesPage from './features/reportes/ReportesPage'
import ProveedoresPage from './features/proveedores/ProveedoresPage'
import PromocionesPage from './features/promociones/PromocionesPage'
import './App.css'

// Envoltorios que conectan el estado del POS con las pantallas.
// (Las pantallas aún reciben `perfil` por props; irán adoptando useAuth()
// conforme se migren a TypeScript.)
export default function App() {
    const { perfil, cargando, errorPerfil } = useAuth()

    if (cargando) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                Cargando...
            </div>
        )
    }

    if (!perfil) {
        return (
            <div className="App">
                <LoginPage />
                {errorPerfil && (
                    <p style={{ textAlign: 'center', color: 'red', marginTop: '15px' }}>{errorPerfil}</p>
                )}
            </div>
        )
    }

    const soloAdmin = (elemento: ReactElement) => <RequireAdmin>{elemento}</RequireAdmin>

    return (
        <BrowserRouter>
            <PosProvider>
                <Routes>
                    <Route element={<Layout />}>
                        <Route index element={<Navigate to="/ventas" replace />} />
                        <Route path="/ventas" element={<VentasPage />} />
                        <Route path="/productos" element={<ProductosPage />} />
                        <Route path="/clientes" element={<ClientesPage />} />
                        <Route path="/caja" element={<CajaPage />} />

                        {/* Rutas exclusivas de administrador (ver matriz de roles) */}
                        <Route path="/departamentos" element={soloAdmin(<DepartamentosPage />)} />
                        {/* Estas dos pantallas ya no necesitan `perfil`: leen el rol del contexto */}
                        <Route path="/proveedores" element={soloAdmin(<ProveedoresPage />)} />
                        <Route path="/empleados" element={soloAdmin(<EmpleadosPage />)} />
                        <Route path="/reportes" element={soloAdmin(<ReportesPage />)} />
                        <Route path="/promociones" element={soloAdmin(<PromocionesPage />)} />

                        <Route path="*" element={<Navigate to="/ventas" replace />} />
                    </Route>
                </Routes>
            </PosProvider>
        </BrowserRouter>
    )
}
