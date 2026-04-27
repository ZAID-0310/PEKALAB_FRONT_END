import React, { useEffect, useState, useCallback } from 'react'; // Añadimos useCallback
import axios from 'axios';
import './PageAsistencia.css';

const PageAsistencia = () => {
    const [asistencias, setAsistencias] = useState([]);
    const [loading, setLoading] = useState(true);

    // Usamos useCallback para que la función no se recree en cada render
    const cargarAsistencias = useCallback(async () => {
    try {
        setLoading(true);
        // 1. Obtenemos el token del localStorage (o del context)
        const tokenVal = localStorage.getItem("token"); 

        const response = await axios.get('http://localhost:9090/api/asistencia/admin/lista-completa', {
            headers: {
                // 2. Enviamos el token para que Spring Security nos deje pasar
                'Authorization': `Bearer ${tokenVal}`
            }
        });
        setAsistencias(response.data);
    } catch (error) {
        console.error("Error al obtener asistencias:", error);
    } finally {
        setLoading(false);
    }
}, []); // El array vacío indica que esta función es estable

    useEffect(() => {
        // Ejecutamos la carga
        cargarAsistencias();
    }, [cargarAsistencias]); // Ahora el efecto depende de una función estable

    const formatearFecha = (fechaStr) => {
        if (!fechaStr) return "-";
        const fecha = new Date(fechaStr);
        return fecha.toLocaleString('es-PE', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            day: '2-digit',
            month: '2-digit'
        });
    };

    return (
        <div className="asistencia-container">
            <div className="header-section">
                <h1>Panel de Asistencias - Pekalaba</h1>
                <p>Monitoreo de ingresos y salidas con validación GPS</p>
                <button className="btn-refresh" onClick={cargarAsistencias} disabled={loading}>
                    {loading ? 'Actualizando...' : 'Actualizar Datos'}
                </button>
            </div>

            {loading ? (
                <div className="loader">Consultando al servidor de Pekalaba...</div>
            ) : (
                <div className="table-responsive">
                    <table className="asistencia-table">
                        <thead>
                            <tr>
                                <th>Motorizado</th>
                                <th>Tienda</th>
                                <th>Entrada</th>
                                <th>Salida</th>
                                <th>Estado</th>
                                <th>Observación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {asistencias.length === 0 ? (
                                <tr><td colSpan="6" style={{textAlign: 'center'}}>No hay registros hoy.</td></tr>
                            ) : (
                                asistencias.map((asist) => (
                                    <tr key={asist.id} className={!asist.esValida ? 'row-invalid' : ''}>
                                        <td className="user-cell">
                                            <strong>{asist.usuario?.nombre || 'N/A'}</strong>
                                        </td>
                                        <td>{asist.horario?.tienda?.nombreTienda || 'S/T'}</td>
                                        <td>{formatearFecha(asist.horaEntrada)}</td>
                                        <td>{formatearFecha(asist.horaSalida)}</td>
                                        <td>
                                            <span className={`status-badge ${asist.esValida ? 'valid' : 'invalid'}`}>
                                                {asist.esValida ? 'VÁLIDO' : 'FUERA DE RANGO'}
                                            </span>
                                        </td>
                                        <td className="obs-cell">{asist.observacion}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PageAsistencia;