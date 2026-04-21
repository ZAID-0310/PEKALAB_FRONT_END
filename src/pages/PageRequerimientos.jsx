import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import './PageRequerimientos.css';

export const PageRequerimientos = () => {
    const [requerimientos, setRequerimientos] = useState([]);
    const [archivo, setArchivo] = useState(null);
    const [cargando, setCargando] = useState(false);
    const { token } = useContext(AuthContext);

    const diasSemanaOrden = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    const obtenerRequerimientos = async () => {
        try {
            const res = await fetch('http://localhost:9090/api/requerimientos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setRequerimientos(data);
        } catch (error) {
            console.error("Error al obtener requerimientos:", error);
        }
    };

    useEffect(() => {
        if (token) obtenerRequerimientos();
    }, [token]);

    // Lógica para ejecutar la asignación automática por cercanía
    const ejecutarAsignacionAutomatica = async () => {
        if (!window.confirm("¿Deseas generar las asignaciones automáticas por cercanía? Se borrarán las asignaciones previas de esta semana.")) return;
        
        setCargando(true);
        try {
            const fechaHoy = new Date().toISOString().split('T')[0];
            const res = await fetch(`http://localhost:9090/api/horarios/generar-automatica?fechaInicio=${fechaHoy}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert("✅ ¡Asignación por cercanía completada!");
                obtenerRequerimientos(); // Refresca la pizarra para ver los cambios a verde
            } else {
                alert("❌ Error al procesar asignaciones.");
            }
        } catch (error) {
            alert("⚠️ Error de conexión con el servidor.");
        } finally {
            setCargando(false);
        }
    };

    const manejarSubidaExcel = async (e) => {
        e.preventDefault();
        if (!archivo) return alert("Selecciona un archivo Excel.");
        setCargando(true);
        const formData = new FormData();
        formData.append('file', archivo);

        try {
            const res = await fetch('http://localhost:9090/api/requerimientos/importar', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                alert("¡Pizarra actualizada!");
                setArchivo(null);
                obtenerRequerimientos();
            } else {
                alert("Error en la importación.");
            }
        } catch (error) {
            alert("Error de conexión.");
        } finally {
            setCargando(false);
        }
    };

    const matrizPorTienda = useMemo(() => {
        const tiendas = {};

        requerimientos.forEach(req => {
            const nombreTienda = req.tienda?.nombreTienda?.trim().toUpperCase() || 'SIN TIENDA';
            const hInicio = req.horaInicio ? req.horaInicio.substring(0, 5).trim() : "00:00";
            const hFin = req.horaFin ? req.horaFin.substring(0, 5).trim() : "00:00";
            const rangoFila = `${hInicio} - ${hFin}`;
            
            if (!tiendas[nombreTienda]) tiendas[nombreTienda] = {};
            if (!tiendas[nombreTienda][rangoFila]) {
                tiendas[nombreTienda][rangoFila] = {
                    "Lunes": [], "Martes": [], "Miércoles": [], 
                    "Jueves": [], "Viernes": [], "Sábado": [], "Domingo": []
                };
            }

            let diaBruto = req.diaSemana ? req.diaSemana.trim().toLowerCase() : "";
            const diaLimpio = diaBruto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            let diaClave = "";
            if (diaLimpio === "lunes") diaClave = "Lunes";
            else if (diaLimpio === "martes") diaClave = "Martes";
            else if (diaLimpio === "miercoles") diaClave = "Miércoles";
            else if (diaLimpio === "jueves") diaClave = "Jueves";
            else if (diaLimpio === "viernes") diaClave = "Viernes";
            else if (diaLimpio === "sabado") diaClave = "Sábado";
            else if (diaLimpio === "domingo") diaClave = "Domingo";

            if (diaClave && tiendas[nombreTienda][rangoFila][diaClave]) {
                tiendas[nombreTienda][rangoFila][diaClave].push({
                    ...req,
                    // Se considera asignado si el estado en BD es ASIGNADO
                    estaAsignado: req.estado === "ASIGNADO"
                });
            }
        });
        return tiendas;
    }, [requerimientos]);

    return (
        <div className="requerimientos-container">
            <header className="header-pkalab">
                <div className="title-section">
                    <h2>Pizarra de Control Semanal</h2>
                    <p>Gestión de cupos y asignación geográfica</p>
                </div>
                <div className="upload-box">
                    <input 
                        type="file" 
                        id="excel-input"
                        accept=".xlsx, .xls" 
                        onChange={(e) => setArchivo(e.target.files[0])} 
                        style={{display: 'none'}}
                    />
                    <label htmlFor="excel-input" className="btn-select">
                        {archivo ? `📄 ${archivo.name}` : "📁 Seleccionar Excel"}
                    </label>
                    
                    <button onClick={manejarSubidaExcel} disabled={cargando || !archivo} className="btn-import">
                        {cargando ? "Cargando..." : "1. Importar"}
                    </button>

                    <button onClick={ejecutarAsignacionAutomatica} disabled={cargando} className="btn-magia">
                        {cargando ? "Procesando..." : "2. Asignar por Cercanía"}
                    </button>
                </div>
            </header>

            <div className="bloques-tiendas">
                {Object.keys(matrizPorTienda).sort().map(nombreTienda => (
                    <div key={nombreTienda} className="tienda-card">
                        <div className="tienda-header"><h3>🏪 {nombreTienda}</h3></div>
                        <div className="table-responsive">
                            <table className="tabla-matriz">
                                <thead>
                                    <tr>
                                        <th>Horario</th>
                                        {diasSemanaOrden.map(d => <th key={d}>{d.substring(0, 3).toUpperCase()}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(matrizPorTienda[nombreTienda]).sort().map(rangoFila => (
                                        <tr key={rangoFila}>
                                            <td className="col-horario"><strong>{rangoFila}</strong></td>
                                            {diasSemanaOrden.map(diaNombre => (
                                                <td key={diaNombre} className="celda-dia">
                                                    <div className="cupos-container-mini">
                                                        {matrizPorTienda[nombreTienda][rangoFila][diaNombre]
                                                            .sort((a, b) => a.nMotorizado - b.nMotorizado)
                                                            .map((req) => (
                                                                <div 
                                                                    key={req.id} 
                                                                    className={`burbuja-cupo ${req.estaAsignado ? 'asignado' : 'pendiente'}`}
                                                                    title={req.estaAsignado ? `Asignado a motorizado` : 'Cupo libre'}
                                                                >
                                                                    {req.estaAsignado ? "✓" : req.nMotorizado}
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};