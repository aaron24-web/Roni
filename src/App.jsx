// src/App.jsx

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import PosProvider from './context/PosProvider';
import { usePos } from './context/pos-context';
import RequireAdmin from './routes/RequireAdmin';
import Layout from './components/Layout';
import Login from './components/Login';
import PantallaVenta from './components/PantallaVenta';
import GestionEmpleados from './components/GestionEmpleados';
import GestionProductos from './components/GestionProductos';
import GestionDepartamentos from './components/GestionDepartamentos';
import GestionClientes from './components/GestionClientes';
import CorteCaja from './components/CorteCaja';
import Reportes from './components/Reportes';
import GestionProveedores from './components/GestionProveedores';
import GestionPromociones from './components/GestionPromociones';
import './App.css';

// Envoltorios que conectan el estado compartido con los componentes de
// pantalla, para no cambiar la API que ya tenían.
function VentasRoute({ perfil }) {
    const { ticketActivo, actualizarCarritoActivo, marcarTicketCobrado, corteActivo } = usePos();
    return (
        <PantallaVenta
            perfil={perfil}
            carrito={ticketActivo.carrito}
            onCarritoChange={actualizarCarritoActivo}
            onVentaCompleta={(ventaId) => marcarTicketCobrado(ticketActivo.id, ventaId)}
            corteActivo={corteActivo}
        />
    );
}

function CajaRoute({ perfil }) {
    const { corteActivo, setCorteActivo } = usePos();
    return <CorteCaja perfil={perfil} corteActivo={corteActivo} onCajaStateChange={setCorteActivo} />;
}

function App() {
    const [session, setSession] = useState(null);
    const [perfil, setPerfil] = useState(null);
    const [cargandoSesion, setCargandoSesion] = useState(true);
    const [errorPerfil, setErrorPerfil] = useState(null);

    // Sesión de Supabase Auth: se restaura al recargar y escucha cambios.
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setCargandoSesion(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
        });
        return () => subscription.unsubscribe();
    }, []);

    // Cuando hay sesión, cargamos el perfil del empleado (con su rol).
    useEffect(() => {
        const cargarPerfil = async () => {
            if (!session) {
                setPerfil(null);
                return;
            }
            const { data, error } = await supabase.rpc('get_mi_perfil');
            if (error || !data || data.length === 0) {
                setErrorPerfil('Tu cuenta no tiene un empleado activo asociado. Contacta al administrador.');
                await supabase.auth.signOut();
                setPerfil(null);
                return;
            }
            setErrorPerfil(null);
            setPerfil(data[0]);
        };
        cargarPerfil();
    }, [session]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setPerfil(null);
    };

    if (cargandoSesion) {
        return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Cargando...</div>;
    }

    if (!perfil) {
        return (
            <div className="App">
                <Login />
                {errorPerfil && (
                    <p style={{ textAlign: 'center', color: 'red', marginTop: '15px' }}>{errorPerfil}</p>
                )}
            </div>
        );
    }

    // Ruta protegida solo para administradores.
    const soloAdmin = (elemento) => (
        <RequireAdmin perfil={perfil}>{elemento}</RequireAdmin>
    );

    return (
        <BrowserRouter>
            <PosProvider perfil={perfil}>
                <Routes>
                    <Route element={<Layout perfil={perfil} onLogout={handleLogout} />}>
                        <Route index element={<Navigate to="/ventas" replace />} />
                        <Route path="/ventas" element={<VentasRoute perfil={perfil} />} />
                        <Route path="/productos" element={<GestionProductos perfil={perfil} />} />
                        <Route path="/clientes" element={<GestionClientes perfil={perfil} />} />
                        <Route path="/caja" element={<CajaRoute perfil={perfil} />} />

                        {/* Rutas exclusivas de administrador (ver matriz de roles) */}
                        <Route path="/departamentos" element={soloAdmin(<GestionDepartamentos perfil={perfil} />)} />
                        <Route path="/proveedores" element={soloAdmin(<GestionProveedores perfil={perfil} />)} />
                        <Route path="/empleados" element={soloAdmin(<GestionEmpleados perfil={perfil} />)} />
                        <Route path="/reportes" element={soloAdmin(<Reportes perfil={perfil} />)} />
                        <Route path="/promociones" element={soloAdmin(<GestionPromociones perfil={perfil} />)} />

                        <Route path="*" element={<Navigate to="/ventas" replace />} />
                    </Route>
                </Routes>
            </PosProvider>
        </BrowserRouter>
    );
}

export default App;
