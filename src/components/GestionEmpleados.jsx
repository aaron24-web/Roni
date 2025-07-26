// src/components/GestionEmpleados.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Estilos (sin cambios)
const styles = {
    container: {
        padding: '20px',
        marginTop: '30px',
        borderTop: '2px solid #ccc'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '400px'
    },
    input: {
        padding: '8px',
        fontSize: '14px'
    },
    button: {
        padding: '10px',
        fontSize: '14px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    message: {
        marginTop: '10px',
        fontWeight: 'bold'
    }
};

export default function GestionEmpleados() {
    const [nombre, setNombre] = useState('');
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [rolId, setRolId] = useState('');
    
    // NUEVO: Estado para la fecha de contratación, inicializado a la fecha de hoy
    const [fechaContratacion, setFechaContratacion] = useState(new Date().toISOString().split('T')[0]);

    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchRoles = async () => {
            const { data, error } = await supabase.from('roles').select('rol_id, nombre_rol');
            if (!error && data.length > 0) {
                setRoles(data);
                setRolId(data[0].rol_id);
            }
        };
        fetchRoles();
    }, []);

    const handleCrearEmpleado = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const { data, error } = await supabase.rpc('crear_empleado_directo', {
                nombre_completo_param: nombre,
                usuario_param: usuario,
                contrasena_param: password,
                rol_id_param: parseInt(rolId),
                fecha_contratacion_param: fechaContratacion // NUEVO: Pasamos la fecha a la función
            });

            if (error) throw error;
            
            setMessage(data);
            setNombre('');
            setUsuario('');
            setPassword('');
            // Reseteamos la fecha a hoy
            setFechaContratacion(new Date().toISOString().split('T')[0]);

        } catch (error) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <h2>Crear Nuevo Empleado</h2>
            <form onSubmit={handleCrearEmpleado} style={styles.form}>
                <input style={styles.input} type="text" placeholder="Nombre Completo" value={nombre} onChange={e => setNombre(e.target.value)} required />
                <input style={styles.input} type="text" placeholder="Nombre de Usuario (para login)" value={usuario} onChange={e => setUsuario(e.target.value)} required />
                <input style={styles.input} type="password" placeholder="Contraseña Temporal" value={password} onChange={e => setPassword(e.target.value)} required />
                
                {/* NUEVO: Campo para la fecha de contratación */}
                <label>Fecha de Contratación:</label>
                <input style={styles.input} type="date" value={fechaContratacion} onChange={e => setFechaContratacion(e.target.value)} required />

                <label>Rol del Empleado:</label>
                <select style={styles.input} value={rolId} onChange={e => setRolId(e.target.value)} required>
                    {roles.map(rol => (
                        <option key={rol.rol_id} value={rol.rol_id}>{rol.nombre_rol}</option>
                    ))}
                </select>
                <button style={styles.button} type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear Empleado'}</button>
            </form>
            {message && <p style={styles.message}>{message}</p>}
        </div>
    );
}