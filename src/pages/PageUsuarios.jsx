import React, { useEffect, useState, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import './PageUsuarios.css';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';

const containerStyle = { width: '100%', height: '300px', borderRadius: '8px', marginBottom: '10px' };
const centerLima = { lat: -12.1585, lng: -76.9535 };
const libraries = ['places'];

export const PageUsuarios = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const autocompleteRef = useRef(null);

    const formInicial = {
        id: null,
        nombre: '',
        apellido: '',
        dni: '',
        correo: '',
        telefono: '',
        password: '',
        rol: 'MOTORIZADO',//EL ROL VACIO 
        estado: true,
        latitud: centerLima.lat,
        longitud: centerLima.lng
    };

    const [formData, setFormData] = useState(formInicial);
    const { token } = useContext(AuthContext);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: "AIzaSyAQf8CE1mCu7K3VjVpuKVemI4Yr7ax9uZA", // Asegúrate de que esta API Key sea válida
        libraries: libraries
    });

    // --- FUNCIÓN CORREGIDA: BUSCA POR DNI ---
    const verificarDNI = async (dniDigitado) => {
        // Validación corregida: Solo procedemos si tiene exactamente 8 dígitos numéricos
        if (!/^\d{8}$/.test(dniDigitado)) return;

        try {
            const res = await fetch(`http://localhost:9090/api/usuarios/dni/${dniDigitado}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const u = await res.json();

                // Extraer coordenadas del Point de PostGIS (Long, Lat) -> Google (Lat, Lng)
                const latBus = u.ubicacionCasa ? u.ubicacionCasa.coordinates[1] : centerLima.lat;
                const lngBus = u.ubicacionCasa ? u.ubicacionCasa.coordinates[0] : centerLima.lng;

                setFormData({
                    ...u,
                    telefono: u.telefono || '',
                    latitud: latBus,
                    longitud: lngBus,
                    password: '' // No cargamos el password por seguridad
                });
                alert(`Usuario encontrado: ${u.nombre}. Ahora puedes editar sus datos.`);
            } else {
                console.log("El DNI no existe. Procediendo como nuevo registro.");
            }
        } catch (error) {
            console.error("Error en la conexión con el servidor:", error);
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

    const onMarkerDragEnd = (event) => {
        setFormData(prev => ({
            ...prev,
            latitud: event.latLng.lat(),
            longitud: event.latLng.lng()
        }));
    };

    const obtenerUsuarios = () => {
        fetch('http://localhost:9090/api/usuarios', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
            .then(res => res.json())
            .then(data => { setUsuarios(data); setCargando(false); })
            .catch(err => { console.error(err); setCargando(false); });
    };

    useEffect(() => { if (token) obtenerUsuarios(); }, [token]);

    const guardarUsuario = async () => {
        // Validaciones básicas
        const patronLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/;
        if (!patronLetras.test(formData.nombre)) {
            alert("❌ El nombre solo debe contener letras");
            return;
        }

        const metodo = formData.id ? 'PUT' : 'POST';
        const url = formData.id
            ? `http://localhost:9090/api/usuarios/${formData.id}`
            : 'http://localhost:9090/api/usuarios/registrar';

        try {
            const res = await fetch(url, {
                method: metodo,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert(formData.id ? "✅ Actualizado correctamente" : "✅ Registrado correctamente");
                setFormData(formInicial);
                obtenerUsuarios();
            } else {
                const errorData = await res.json();
                alert("❌ Error: " + (errorData.message || "Error en el servidor"));
            }
        } catch (error) {
            alert("❌ Error de conexión con el servidor");
        }
    };
    const cambiarEstado = async (id, estadoActual) => {
        const nuevoEstado = !estadoActual;
        const mensaje = nuevoEstado ? "¿Desea habilitar a este usuario?" : "¿Desea deshabilitar a este usuario?";

        if (!window.confirm(mensaje)) return;

        try {
            const res = await fetch(`http://localhost:9090/api/usuarios/${id}/estado?activo=${nuevoEstado}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                obtenerUsuarios(); // Esto recarga la tabla para ver el cambio
            } else {
                alert("❌ Error al cambiar el estado");
            }
        } catch (error) {
            console.error("Error en la conexión:", error);
        }
    };

    const eliminarUsuario = (id) => {
        if (!window.confirm("¿Está seguro de eliminar este usuario?")) return;
        fetch(`http://localhost:9090/api/usuarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => { if (res.ok) obtenerUsuarios(); });
    };

    if (!isLoaded) return <div className="loading">Cargando Google Maps...</div>;
    if (cargando) return <div className="loading">Cargando Usuarios...</div>;

    return (
        <div className="usuarios-container">
            <div className="edit-form-container">
                <h3>{formData.id ? `Editando a: ${formData.nombre}` : "Registrar Nuevo Personal"}</h3>

                <input
                    placeholder="DNI (8 dígitos)"
                    value={formData.dni}
                    onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setFormData({ ...formData, dni: val });
                        if (val.length === 8) verificarDNI(val);
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            verificarDNI(formData.dni);
                        }
                    }}
                />

                <input
                    placeholder="Nombre"
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '') })}
                />

                <input
                    placeholder="Apellido"
                    value={formData.apellido}
                    onChange={e => setFormData({ ...formData, apellido: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '') })}
                />

                <input
                    type='tel'
                    placeholder="Teléfono (9 dígitos)"
                    value={formData.telefono}
                    onChange={e => setFormData({ ...formData, telefono: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                />

                <input
                    placeholder="Correo"
                    value={formData.correo}
                    onChange={e => setFormData({ ...formData, correo: e.target.value })}
                />

                {!formData.id && (
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                )}

                <label>Dirección en el mapa:</label>
                <Autocomplete onLoad={(ref) => (autocompleteRef.current = ref)} onPlaceChanged={alCambiarDireccion}>
                    <input
                        type="text"
                        placeholder="Buscar calle o distrito..."
                        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                </Autocomplete>

                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={{ lat: formData.latitud, lng: formData.longitud }}
                    zoom={15}
                >
                    <Marker
                        position={{ lat: formData.latitud, lng: formData.longitud }}
                        draggable={true}
                        onDragEnd={onMarkerDragEnd}
                    />
                </GoogleMap>

                <select value={formData.rol} onChange={e => setFormData({ ...formData, rol: e.target.value })}>
                    
                    <option value="MOTORIZADO">MOTORIZADO</option>
                    <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                </select>

                <div className="button-group">
                    <button onClick={guardarUsuario} className="btn-save">
                        {formData.id ? "Guardar Cambios" : "Registrar"}
                    </button>
                    {formData.id && (
                        <button onClick={() => setFormData(formInicial)} className="btn-cancel">
                            Cancelar
                        </button>
                    )}
                </div>
            </div>

            <div className="tabla-responsive">
                <table className="tabla-pkalab">
                    <thead>
                        <tr>
                            <th>DNI</th>
                            <th>Nombre Completo</th>
                            <th>Teléfono</th>
                            <th>Correo</th>
                            <th>Rol</th>
                            <th>Estado</th> {/* <--- AGREGA ESTO */}
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    {/* Busca esta parte en tu tabla y reemplaza el contenido del <tbody> */}
                    <tbody>
                        {usuarios.map(u => (
                            <tr key={u.id} style={{ opacity: u.estado ? 1 : 0.6 }}>
                                <td><strong>{u.dni}</strong></td>
                                <td>{u.nombre} {u.apellido}</td>
                                <td>{u.telefono || '---'}</td>
                                <td>{u.correo}</td>
                                <td>{u.rol}</td>

                                {/* Columna de Estado */}
                                <td style={{ textAlign: 'center' }}>
                                    {u.estado ? "✅" : "❌"}
                                </td>

                                <td>
                                    {/* Lápiz para editar */}
                                    <button
                                        className="btn-icon edit"
                                        disabled={!u.estado}
                                        onClick={() => {
                                            const lat = u.ubicacionCasa ? u.ubicacionCasa.coordinates[1] : centerLima.lat;
                                            const lng = u.ubicacionCasa ? u.ubicacionCasa.coordinates[0] : centerLima.lng;
                                            setFormData({ ...u, latitud: lat, longitud: lng, password: '' });
                                            window.scrollTo(0, 0);
                                        }}
                                    >✏️</button>

                                    {/* Switch de habilitar/deshabilitar */}
                                    <button
                                        className="btn-icon status"
                                        onClick={() => cambiarEstado(u.id, u.estado)}
                                        title={u.estado ? "Deshabilitar" : "Habilitar"}
                                        style={{ marginLeft: '10px' }}
                                    >
                                        {u.estado ? "🚫" : "✔️"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};