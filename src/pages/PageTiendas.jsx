import React, { useEffect, useState, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import './PageTiendas.css';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import Swal from 'sweetalert2';

const containerStyle = { width: '100%', height: '300px', borderRadius: '8px', marginBottom: '10px' };
const centerLima = { lat: -12.1585, lng: -76.9535 };
const libraries = ['places'];

export const PageTiendas = () => {
    const [tiendas, setTiendas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const autocompleteRef = useRef(null);

    const formInicial = {
        id: null,
        nombreTienda: '',
        ruc: '',
        direccion: '',
        estado: true,
        radioPermitidoMetros: 100,
        latitud: centerLima.lat,
        longitud: centerLima.lng
    };

    const [formData, setFormData] = useState(formInicial);
    const { token } = useContext(AuthContext);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: "AIzaSyAQf8CE1mCu7K3VjVpuKVemI4Yr7ax9uZA",
        libraries: libraries
    });

    const buscarPorNombre = async (nombre) => {
        // Si el nombre es muy corto, no buscamos
        if (nombre.trim().length < 3) return;

        try {
            const res = await fetch(`http://localhost:9090/api/tiendas/buscar?nombre=${encodeURIComponent(nombre)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();

                // Buscamos si hay una tienda que se llame exactamente igual
                const encontrada = data.find(t => t.nombreTienda.toLowerCase() === nombre.toLowerCase());

                if (encontrada) {
                    const latBus = encontrada.ubicacion ? encontrada.ubicacion.coordinates[1] : centerLima.lat;
                    const lngBus = encontrada.ubicacion ? encontrada.ubicacion.coordinates[0] : centerLima.lng;

                    setFormData({
                        ...encontrada,
                        latitud: latBus,
                        longitud: lngBus
                    });
                    alert(`✅ Tienda encontrada: ${encontrada.nombreTienda}`);
                }
            }
        } catch (error) {
            console.error("Error buscando tienda:", error);
        }
    };

    const cambiarEstadoTienda = async (id, estadoActual) => {
        const nuevoEstado = !estadoActual;
        if (!window.confirm(nuevoEstado ? "¿Activar sucursal?" : "¿Desactivar sucursal?")) return;

        // Buscamos la tienda específica en nuestra lista actual para no enviar campos vacíos
        const tiendaSeleccionada = tiendas.find(t => t.id === id);

        if (!tiendaSeleccionada) return;

        try {
            const res = await fetch(`http://localhost:9090/api/tiendas/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                // Enviamos los datos de la tienda seleccionada, solo cambiando el estado
                body: JSON.stringify({ ...tiendaSeleccionada, estado: nuevoEstado })
            });

            if (res.ok) {
                obtenerTiendas(); // Refresca la tabla con los datos correctos
            } else {
                alert("Error al actualizar el estado en el servidor");
            }
        } catch (error) {
            console.error("Error en la petición:", error);
        }
    };

    const alCambiarDireccion = () => {
        const place = autocompleteRef.current.getPlace();
        if (place.geometry) {
            setFormData(prev => ({
                ...prev,
                latitud: place.geometry.location.lat(),
                longitud: place.geometry.location.lng()
            }));
        }
    };

    const obtenerTiendas = () => {
        fetch('http://localhost:9090/api/tiendas', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => { setTiendas(data); setCargando(false); })
            .catch(err => { console.error(err); setCargando(false); });
    };

    useEffect(() => { if (token) obtenerTiendas(); }, [token]);

    const guardarTienda = async () => {
        // 1. Validación previa de RUC
        if (formData.ruc.length !== 11) {
            Swal.fire({
                title: 'RUC Inválido',
                text: 'El RUC debe tener exactamente 11 dígitos.',
                icon: 'warning',
                confirmButtonColor: '#f39c12'
            });
            return;
        }

        const metodo = formData.id ? 'PUT' : 'POST';
        const url = formData.id
            ? `http://localhost:9090/api/tiendas/${formData.id}`
            : 'http://localhost:9090/api/tiendas/registrar';

        try {
            const res = await fetch(url, {
                method: metodo,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            // 2. Aquí es donde pones el SweetAlert de éxito
            if (res.ok) {
                Swal.fire({
                    title: '¡Logrado!',
                    text: formData.id ? 'Tienda actualizada correctamente' : 'Tienda registrada con éxito',
                    icon: 'success',
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'Genial'
                });

                // Limpiamos el formulario y refrescamos la lista
                setFormData(formInicial);
                obtenerTiendas();
            } else {
                // Opcional: Un mensaje de error si el servidor responde mal (ej. RUC duplicado)
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudo procesar la solicitud. Revisa los datos.',
                    icon: 'error',
                    confirmButtonColor: '#d33'
                });
            }
        } catch (error) {
            // Por si se cae el backend o no hay internet
            Swal.fire({
                title: 'Error de conexión',
                text: 'El servidor no responde.',
                icon: 'error',
                confirmButtonColor: '#d33'
            });
        }
    };

    // Solo permite números y limita la longitud
    const validarSoloNumeros = (valor, maxLen) => {
        const soloNumeros = valor.replace(/\D/g, ''); // Elimina cualquier cosa que no sea número
        return soloNumeros.slice(0, maxLen);
    };

    // Solo permite letras y espacios
    const validarSoloLetras = (valor) => {
        return valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '');
    };

    if (!isLoaded) return <div>Cargando Google Maps...</div>;
    if (cargando) return <div className="loading">Cargando Tiendas de Pekalab...</div>;

    return (
        <div className="tienda-container"> {/* se crea su contenedor*/}
            <div className="tienda-edit-form-container">
                <h3>{formData.id ? `Editando: ${formData.nombreTienda}` : "Registrar Sucursal"}</h3>

                <input
                    placeholder="Nombre de la Tienda / Sucursal"
                    value={formData.nombreTienda}
                    onChange={e => setFormData({ ...formData, nombreTienda: validarSoloLetras(e.target.value) })}
                    // Se dispara cuando sales del input
                    onBlur={e => buscarPorNombre(e.target.value)}
                    // Se dispara al presionar Enter
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            buscarPorNombre(formData.nombreTienda);
                        }
                    }}
                />

                {/* Input de RUC */}
                <input
                    placeholder="RUC (11 dígitos)"
                    value={formData.ruc}
                    onChange={e => setFormData({
                        ...formData,
                        ruc: validarSoloNumeros(e.target.value, 11)
                    })}
                />

                <label>Ubicación de la Sucursal:</label>
                <Autocomplete onLoad={(ref) => (autocompleteRef.current = ref)} onPlaceChanged={alCambiarDireccion}>
                    <input type="text" placeholder="Buscar dirección exacta..." />
                </Autocomplete>

                <GoogleMap mapContainerStyle={containerStyle} center={{ lat: formData.latitud, lng: formData.longitud }} zoom={16}>
                    <Marker
                        position={{ lat: formData.latitud, lng: formData.longitud }}
                        draggable={true}
                        onDragEnd={e => setFormData({ ...formData, latitud: e.latLng.lat(), longitud: e.latLng.lng() })}
                    />
                </GoogleMap>

                <div className="input-group">
                    <label>Radio de Asistencia (Metros):</label>
                    <input type="number" value={formData.radioPermitidoMetros} onChange={e => setFormData({ ...formData, radioPermitidoMetros: parseInt(e.target.value) })} />
                </div>

                <div className='tienda-button-group'>
                    <button onClick={guardarTienda} className="btn-save">{formData.id ? "Actualizar Tienda" : "Registrar Tienda"}</button>
                    {formData.id && <button onClick={() => setFormData(formInicial)} className="btn-cancel">Cancelar</button>}
                </div>
            </div>

            <div className='tienda-responsive'>
                <table className="tabla-pkalab-tienda">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>RUC</th>
                            <th>Radio</th>
                            <th>ESTADO</th>
                            <th>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tiendas.map(t => (
                            <tr key={t.id}>
                                <td>{t.nombreTienda}</td>
                                <td>{t.ruc}</td>
                                <td>{t.radioPermitidoMetros}m</td>

                                {/* Columna Estado: Checkbox igual a tu imagen de Usuarios */}
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={t.estado}
                                        readOnly
                                        style={{ cursor: 'default' }}
                                    />
                                </td>

                                <td>
                                    <div className="tienda-acciones-buttons">
                                        {/* Botón Editar (Lápiz naranja) */}
                                        <button
                                            className="btn-icon edit"
                                            disabled={!t.estado}
                                            onClick={() => {
                                                const lat = t.ubicacion ? t.ubicacion.coordinates[1] : centerLima.lat;
                                                const lng = t.ubicacion ? t.ubicacion.coordinates[0] : centerLima.lng;
                                                setFormData({ ...t, latitud: lat, longitud: lng });
                                                window.scrollTo(0, 0);
                                            }}
                                        >
                                            ✏️
                                        </button>

                                        {/* Botón Bloquear/Desbloquear (Icono rojo de prohibido) */}
                                        <button
                                            className="tienda-btn-icon status"
                                            onClick={() => cambiarEstadoTienda(t.id, t.estado)}
                                        >
                                            {t.estado ? "🚫" : "✔️"}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};