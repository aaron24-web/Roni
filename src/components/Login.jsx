// src/components/Login.jsx

import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

// Estilos (sin cambios)
const styles = {
    container: { height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' },
    loginBox: { padding: '40px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: '100%', maxWidth: '400px', textAlign: 'center' },
    input: { width: '100%', padding: '12px', fontSize: '16px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
    button: { width: '100%', padding: '12px', fontSize: '16px', fontWeight: 'bold', border: 'none', borderRadius: '4px', backgroundColor: '#0078d4', color: 'white', cursor: 'pointer' },
    error: { color: 'red', marginTop: '10px' }
};


// Le pasamos la función 'onLogin' desde App.jsx
export default function Login({ onLogin }) {
    const [loading, setLoading] = useState(false);
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Llamamos a nuestra nueva función de base de datos
            const { data, error } = await supabase.rpc('iniciar_sesion_directo', {
                usuario_param: usuario,
                contrasena_param: password
            });

            if (error) throw error;
            
            // Si la función devuelve datos (un empleado), el login es exitoso
            if (data && data.length > 0) {
                // Le pasamos el perfil del empleado a App.jsx
                onLogin(data[0]);
            } else {
                // Si no devuelve datos, las credenciales son incorrectas
                throw new Error("Usuario o contraseña incorrectos.");
            }

        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.loginBox}>
                <h2>Iniciar Sesión - Papelería Roni</h2>
                <p style={{color: 'orange'}}>ADVERTENCIA: Modo de login temporal.</p>
                <form onSubmit={handleLogin}>
                    <input
                        style={styles.input}
                        type="text"
                        placeholder="Usuario"
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        required
                    />
                    <input
                        style={styles.input}
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button style={styles.button} type="submit" disabled={loading}>
                        {loading ? 'Ingresando...' : 'Ingresar'}
                    </button>
                    {error && <p style={styles.error}>{error}</p>}
                </form>
            </div>
        </div>
    );
}