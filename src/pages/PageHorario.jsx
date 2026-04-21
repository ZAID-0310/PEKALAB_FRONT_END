import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import './PageHorario.css';

export const PageHorario = () => {
    const [todosLosHorarios, setTodosLosHorarios] = useState([]);
    const [busqueda, setBusqueda] = useState(""); // Estado para el buscador
    const [cargando, setCargando] = useState(true);
    const { token } = useContext(AuthContext);

    const obtenerTodosLosHorarios = async () => {
        try {
            setCargando(true);
            const res = await fetch(`http://localhost:9090/api/horarios/todos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTodosLosHorarios(data);
            }
        } catch (error) {
            console.error("Error al obtener horarios:", error);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (token) obtenerTodosLosHorarios();
    }, [token]);

    // Filtrado lógico: Buscamos por nombre de trabajador o por tienda
    const horariosFiltrados = useMemo(() => {
        return todosLosHorarios.filter(h => 
            h.usuario?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            h.tienda?.nombreTienda.toLowerCase().includes(busqueda.toLowerCase())
        );
    }, [busqueda, todosLosHorarios]);

    if (cargando) return <div className="pkalab-loader">Cargando gestión de horarios...</div>;

    return (
        <div className="page-horario-container">
            <header className="horario-header">
                <div className="header-info">
                    <h2>📋 Panel de Asignaciones Finales</h2>
                    <p>Filtra por motorizado para verificar sus turnos individuales</p>
                </div>
                
                {/* Buscador Integrado */}
                <div className="search-box">
                    <input 
                        type="text" 
                        placeholder="🔍 Buscar motorizado o tienda..." 
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="input-search"
                    />
                </div>
            </header>

            <div className="tabla-gestion-container">
                {horariosFiltrados.length > 0 ? (
                    <table className="tabla-pkalab">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Motorizado</th>
                                <th>Tienda / Ubicación</th>
                                <th>Entrada</th>
                                <th>Salida</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {horariosFiltrados.map((h) => (
                                <tr key={h.id}>
                                    <td>{h.fecha}</td>
                                    <td><strong>{h.usuario?.nombre || 'Sin Nombre'}</strong></td>
                                    <td>
                                        <div className="tienda-info">
                                            <span>{h.tienda?.nombreTienda}</span>
                                            <small>{h.tienda?.direccion}</small>
                                        </div>
                                    </td>
                                    <td className="hora-enfasizada">{h.horaInicio.substring(0, 5)}</td>
                                    <td className="hora-enfasizada">{h.horaFin.substring(0, 5)}</td>
                                    <td>
                                        <span className="badge-confirmado">Confirmado</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="no-resultados">
                        No se encontraron horarios para "{busqueda}"
                    </div>
                )}
            </div>
        </div>
    );
};