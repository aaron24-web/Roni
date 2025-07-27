// src/components/GestionPromociones.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './PantallaVenta.css';

// Definimos los tipos de promoción que nuestro sistema manejará.
// 'value' es lo que se guarda en la BD, 'label' es lo que ve el admin.
const TIPOS_DE_PROMOCION = [
    { value: 'PORCENTAJE', label: 'Porcentaje de Descuento' },
    { value: 'CANTIDAD_X_CANTIDAD', label: 'Cantidad por Cantidad (ej: 2x1, 3x2)' }
];

const estadoInicialPromocion = {
    nombre: '',
    tipo_promocion: TIPOS_DE_PROMOCION[0].value,
    valor: 0, // Aquí guardaremos el % o la cantidad (ej: 2 para un 2x1)
    descripcion: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    activo: true,
};

export default function GestionPromociones({ perfil }) {
    const [promociones, setPromociones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentPromo, setCurrentPromo] = useState(estadoInicialPromocion);
    const [isEditing, setIsEditing] = useState(false);

    const fetchPromociones = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('promociones').select('*').order('nombre');
        if (error) console.error("Error al cargar promociones:", error);
        else setPromociones(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchPromociones();
    }, []);

    const openModalNuevo = () => {
        setIsEditing(false);
        setCurrentPromo(estadoInicialPromocion);
        setShowModal(true);
    };

    const openModalEditar = (promo) => {
        setIsEditing(true);
        // Aseguramos que las fechas se muestren correctamente
        promo.fecha_inicio = promo.fecha_inicio ? new Date(promo.fecha_inicio).toISOString().split('T')[0] : '';
        promo.fecha_fin = promo.fecha_fin ? new Date(promo.fecha_fin).toISOString().split('T')[0] : '';
        setCurrentPromo(promo);
        setShowModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCurrentPromo(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        
        const promoData = { ...currentPromo };
        
        // Validamos el valor antes de guardar
        if (isNaN(parseFloat(promoData.valor)) || parseFloat(promoData.valor) <= 0) {
            alert("El 'valor' de la promoción debe ser un número mayor que cero.");
            return;
        }

        // Aseguramos que fechas vacías se guarden como nulas
        if (!promoData.fecha_fin) {
            promoData.fecha_fin = null;
        }

        let error;
        // Limpiamos el objeto de datos que no existe en la tabla si lo hubiera
        delete promoData.promocion_reglas;

        if (isEditing) {
            const { promocion_id, ...dataToUpdate } = promoData;
            ({ error } = await supabase.from('promociones').update(dataToUpdate).eq('promocion_id', promocion_id));
        } else {
            ({ error } = await supabase.from('promociones').insert([promoData]));
        }

        if (error) {
            alert(`Error al guardar: ${error.message}`);
        } else {
            alert(`Promoción ${isEditing ? 'actualizada' : 'creada'} exitosamente.`);
            setShowModal(false);
            fetchPromociones();
        }
    };
    
    // Función para mostrar una etiqueta más clara para el campo "Valor"
    const getValorLabel = () => {
        switch(currentPromo.tipo_promocion) {
            case 'PORCENTAJE':
                return 'Porcentaje de Descuento (ej: 15 para 15%)';
            case 'CANTIDAD_X_CANTIDAD':
                return 'Cantidad de la Oferta (ej: 2 para un 2x1, 3 para un 3x2)';
            default:
                return 'Valor';
        }
    }

    return (
        <div className="pos-container">
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{isEditing ? 'Editar' : 'Nueva'} Promoción</h2>
                        <form onSubmit={handleGuardar} style={{display: 'flex', flexDirection:'column', gap:'10px'}}>
                            
                            <label>Nombre de la Promoción (ej: "Verano 2x1"):</label>
                            <input type="text" name="nombre" value={currentPromo.nombre} onChange={handleInputChange} required className="pos-input" />
                            
                            <label>Tipo de Promoción:</label>
                            <select name="tipo_promocion" value={currentPromo.tipo_promocion} onChange={handleInputChange} required className="pos-input">
                                {TIPOS_DE_PROMOCION.map(tipo => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                            </select>

                            <label>{getValorLabel()}:</label>
                            <input type="number" name="valor" value={currentPromo.valor} onChange={handleInputChange} required className="pos-input" />

                            <label>Descripción:</label>
                            <textarea name="descripcion" value={currentPromo.descripcion || ''} onChange={handleInputChange} className="pos-input" />

                            <label>Fecha de Inicio:</label>
                            <input type="date" name="fecha_inicio" value={currentPromo.fecha_inicio} onChange={handleInputChange} required className="pos-input" />

                            <label>Fecha de Fin (Opcional):</label>
                            <input type="date" name="fecha_fin" value={currentPromo.fecha_fin || ''} onChange={handleInputChange} className="pos-input" />

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><label htmlFor="activo">Activa:</label><input type="checkbox" id="activo" name="activo" checked={currentPromo.activo} onChange={handleInputChange}/></div>
                            
                            <div className="footer"><button type="button" onClick={() => setShowModal(false)} className="pos-button" style={{backgroundColor: '#6c757d'}}>Cancelar</button><button type="submit" className="checkout-btn">Guardar</button></div>
                        </form>
                    </div>
                </div>
            )}

            <div className="search-bar" style={{justifyContent: 'space-between', alignItems: 'center'}}>
                <h2>Gestión de Promociones</h2>
                {perfil?.nombre_rol?.toLowerCase() === 'administrador' && <button className="pos-button" onClick={openModalNuevo}>Añadir Promoción</button>}
            </div>
            <div className="table-container">
                <table className="sales-table">
                    <thead><tr><th>Nombre</th><th>Tipo</th><th>Valor</th><th>Activo</th><th>Acciones</th></tr></thead>
                    <tbody>
                        {promociones.map(promo => (
                            <tr key={promo.promocion_id}>
                                <td>{promo.nombre}</td>
                                <td>{TIPOS_DE_PROMOCION.find(t => t.value === promo.tipo_promocion)?.label || promo.tipo_promocion}</td>
                                <td>{promo.valor}</td>
                                <td>{promo.activo ? 'Sí' : 'No'}</td>
                                <td>
                                    {perfil?.nombre_rol?.toLowerCase() === 'administrador' && <button onClick={() => openModalEditar(promo)}>Editar</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}