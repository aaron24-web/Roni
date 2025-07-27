// src/components/GestionPromociones.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './PantallaVenta.css';

export default function GestionPromociones({ perfil }) {
    const [promociones, setPromociones] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPromociones = async () => {
            setLoading(true);
            const { data, error } = await supabase.from('promociones').select('*');
            if (error) {
                console.error("Error al cargar promociones:", error);
            } else {
                setPromociones(data);
            }
            setLoading(false);
        };
        fetchPromociones();
    }, []);

    if (loading) {
        return <div style={{padding: '20px'}}>Cargando...</div>;
    }

    return (
        <div className="pos-container">
            <div className="search-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Gestión de Promociones</h2>
                {perfil?.nombre_rol?.toLowerCase() === 'administrador' && (
                    <button className="pos-button">Añadir Nueva Promoción</button>
                )}
            </div>
            <div className="table-container">
                <table className="sales-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Tipo</th>
                            <th>Descripción</th>
                            <th>Activo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {promociones.map(promo => (
                            <tr key={promo.promocion_id}>
                                <td>{promo.nombre}</td>
                                <td>{promo.tipo_promocion}</td>
                                <td>{promo.descripcion}</td>
                                <td>{promo.activo ? 'Sí' : 'No'}</td>
                                <td>
                                    {perfil?.nombre_rol?.toLowerCase() === 'administrador' && (
                                        <button>Editar</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}