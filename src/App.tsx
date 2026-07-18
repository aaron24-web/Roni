// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import PosProvider from './context/PosProvider'
import { usePos } from './context/pos-context'
import { useAuth } from './context/auth-context'
import RequireAdmin from './routes/RequireAdmin'
import Layout from './components/Layout'
import Login from './components/Login'
import PantallaVenta from './components/PantallaVenta'
import GestionEmpleados from './components/GestionEmpleados'
import GestionProductos from './components/GestionProductos'
import DepartamentosPage from './features/departamentos/DepartamentosPage'
import GestionClientes from './components/GestionClientes'
import CorteCaja from './components/CorteCaja'
import Reportes from './components/Reportes'
import GestionProveedores from './components/GestionProveedores'
import GestionPromociones from './components/GestionPromociones'
import './App.css'

// Envoltorios que conectan el estado del POS con las pantallas.
// (Las pantallas aún reciben `perfil` por props; irán adoptando useAuth()
// conforme se migren a TypeScript.)
function VentasRoute() {
    const { perfil } = useAuth()
    const { ticketActivo, actualizarCarritoActivo, marcarTicketCobrado, corteActivo } = usePos()
    return (
        <PantallaVenta
            perfil={perfil}
            carrito={ticketActivo.carrito}
            onCarritoChange={actualizarCarritoActivo}
            onVentaCompleta={(ventaId: number | null) => marcarTicketCobrado(ticketActivo.id, ventaId)}
            corteActivo={corteActivo}
        />
    )
}

function CajaRoute() {
    const { perfil } = useAuth()
    const { corteActivo, setCorteActivo } = usePos()
    return <CorteCaja perfil={perfil} corteActivo={corteActivo} onCajaStateChange={setCorteActivo} />
}

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
                <Login />
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
                        <Route path="/ventas" element={<VentasRoute />} />
                        <Route path="/productos" element={<GestionProductos perfil={perfil} />} />
                        <Route path="/clientes" element={<GestionClientes perfil={perfil} />} />
                        <Route path="/caja" element={<CajaRoute />} />

                        {/* Rutas exclusivas de administrador (ver matriz de roles) */}
                        <Route path="/departamentos" element={soloAdmin(<DepartamentosPage />)} />
                        {/* Estas dos pantallas ya no necesitan `perfil`: leen el rol del contexto */}
                        <Route path="/proveedores" element={soloAdmin(<GestionProveedores />)} />
                        <Route path="/empleados" element={soloAdmin(<GestionEmpleados />)} />
                        <Route path="/reportes" element={soloAdmin(<Reportes perfil={perfil} />)} />
                        <Route path="/promociones" element={soloAdmin(<GestionPromociones perfil={perfil} />)} />

                        <Route path="*" element={<Navigate to="/ventas" replace />} />
                    </Route>
                </Routes>
            </PosProvider>
        </BrowserRouter>
    )
}
