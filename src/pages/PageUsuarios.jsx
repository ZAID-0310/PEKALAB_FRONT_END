import React, { useEffect, useState, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import './PageUsuarios.css';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
//import Aos from 'aos';
//import "aos/dist/aos.css";


const containerStyle = { width: '100%', height: '300px', borderRadius: '8px', marginBottom: '10px' };
const centerLima = { lat: -12.1585, lng: -76.9535 };
const libraries = ['places'];


//--- VALIDACION PARA LAS PALABRAS ---
const capitalizarPalabras = (texto) => {
    if (!texto) return "";
    return texto
        .split(' ')
        .map(palabra => {
            return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase();
        })
        .join(' ');
};


export const PageUsuarios = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const autocompleteRef = useRef(null);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
    const [direccionTexto, setDireccionTexto] = useState("Cargando dirección...");
    const [busqueda, setBusqueda] = useState("");

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

    // 3. EFECTOS (AOS y Carga de Datos)
    //useEffect(() => {
    // Aos.init({
    //   duration: 800,
    // once: true,
    //});
    // if (token) obtenerUsuarios();
    //}, [token]);


    //obtener la direccion atraves de las cordenadas
    const obtenerDireccionTexto = (lat, lng, callback) => {
        if (!window.google) return;
        const geocoder = new window.google.maps.Geocoder();
        const latlng = { lat: parseFloat(lat), lng: parseFloat(lng) };

        geocoder.geocode({ location: latlng }, (results, status) => {
            if (status === "OK") {
                if (results[0]) {
                    // results[0].formatted_address trae la dirección completa
                    callback(results[0].formatted_address);
                } else {
                    callback("Dirección no encontrada");
                }
            } else {
                callback("Error de Geocodificación");
            }
        });
    };

    // --- NUEVA FUNCIÓN PARA EL PASO 2 ---
    const verDetalles = (u) => {
        setUsuarioSeleccionado(u);
        setDireccionTexto("Cargando..."); // Texto temporal mientras Google responde

        // Extraemos latitud y longitud del objeto del usuario
        const lat = u.ubicacionCasa ? u.ubicacionCasa.coordinates[1] : null;
        const lng = u.ubicacionCasa ? u.ubicacionCasa.coordinates[0] : null;

        if (lat && lng) {
            // Llamamos a la función que creamos antes para convertir coordenadas a texto
            obtenerDireccionTexto(lat, lng, (dir) => {
                setDireccionTexto(dir);
            });
        } else {
            setDireccionTexto("Sin ubicación registrada");
        }
    };

    //conexion con el api de whasap
    const abrirWhatsapp = (telefono) => {
        if (!telefono) {
            alert("❌ Este usuario no tiene un teléfono registrado");
            return;
        }
        // Limpiamos el número de cualquier caracter que no sea dígito
        const numeroLimpio = telefono.replace(/\D/g, '');

        // Si estás en Perú, el código de país es 51. 
        // Usamos api.whatsapp.com para que funcione en PC y Celular
        const url = `https://api.whatsapp.com/send?phone=51${numeroLimpio}&text=Hola, me comunico de la administración.`;

        window.open(url, '_blank');
    };

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
        // Validaciones básicas para nombre
        const patronLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/;//solo acepta letras 
        const patronCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;//formato de correo
        const patronDni = /^\d{8}$/; // Exactamente 8 números
        const patronTelefono = /^9\d{8}$/; // Valida que empiece con 9 y tenga 9 dígitos en total


        // --- VALIDACIÓN DE DNI ---
        if (!patronDni.test(formData.dni)) {
            alert("❌ El DNI debe tener exactamente 8 dígitos numéricos");
            return;
        }

        // --- VALIDACIÓN DE TELÉFONO (Obligatorio) ---
        if (!formData.telefono || formData.telefono.trim() === "") {
            alert("❌ El teléfono es obligatorio para el registro");
            return;
        }
        if (!patronTelefono.test(formData.telefono)) {
            alert("❌ El teléfono debe tener 9 dígitos y empezar con 9");
            return;
        }

        //validad si en campo esta vacio
        if (!formData.nombre.trim()) {
            alert("❌ El nombre no puede estar vacío");
            return;
        }

        //validar si el campo esta vacio
        if (!formData.apellido.trim() || !patronLetras.test(formData.apellido)) {
            alert("❌ Verifique el apellido (solo letras y no puede estar vacío)");
            return;
        }

        // Validaciones básicas para nombre
        if (!patronLetras.test(formData.nombre)) {
            alert("❌ El nombre solo debe contener letras");
            return;
        }
        // Validaciones básicas para apellido

        if (!patronLetras.test(formData.apellido)) {
            alert("❌ El nombre solo debe contener letras");
            return;
        }

        //Validaciones básicas el campo de correo
        if (!patronCorreo.test(formData.correo)) {
            alert("❌ El formato del correo es incorrecto (ejemplo@gmail.com)")
            return;
        }
        //validacion para la contraseña
        if (!formData.id && formData.password.length < 6) {
            alert("❌ La contraseña almenos debe tener 6 caracteres")
            return;
        }

        //campo de mapa sea obligatorio 
        if (formData.latitud === centerLima.lat && formData.longitud === centerLima.lng) {
            alert("⚠️ La ubicación es obligatoria. Por favor, use el buscador o mueva el marcador en el mapa.");
            return; // Detiene el registro
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

    //NO SE ESTA UTILIZANDO
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
            <div id='formulario-registro' style={{ scrollSnapMarginTop: '100' }} className="edit-form-container" data-aos="fade-right">
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
                    onChange={e => {
                        const valorProcesado = capitalizarPalabras(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, ''));
                        setFormData({ ...formData, nombre: valorProcesado });
                    }}
                />

                <input
                    placeholder="Apellido"
                    value={formData.apellido}
                    onChange={e => {
                        const valorProcesado = capitalizarPalabras(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, ''));
                        setFormData({ ...formData, apellido: valorProcesado });
                    }}
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
            {/* 1. CONTENEDOR DEL BUSCADOR (Va antes de la tabla) */}
            <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                maxWidth: '500px'

            }}
                data-aos="fade-up"
                data-aos-delay="200">
                {/* El Input */}
                <input
                    type="text"
                    placeholder="🔍 Buscar por nombre o DNI..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="form-control"
                    style={{ flex: 1, borderRadius: '8px' }}
                />

                {/* AQUÍ VA EL BOTÓN DE LIMPIAR */}
                {busqueda && (
                    <button
                        onClick={() => setBusqueda("")}
                        style={{
                            padding: '0 20px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {/* 2. TU TABLA (Debajo del buscador) */}
            <div className="tabla-container">
                <table className="table">
                    <thead>
                        {/* ... tus cabeceras DNI, NOMBRE, etc ... */}
                    </thead>
                    <tbody>
                        {/* Aquí va el código del .filter().map() que ya tienes listo */}
                        {usuarios
                            .filter(u => {
                                const termino = busqueda.toLowerCase();
                                const nombreCompleto = `${u.nombre} ${u.apellido}`.toLowerCase();
                                const dni = u.dni ? u.dni.toString() : "";
                                return nombreCompleto.includes(termino) || dni.includes(termino);
                            })
                            .map(u => (
                                <tr key={u.id}>
                                    {/* ... contenido de la fila ... */}
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>


            <div className="tabla-responsive" data-aos="fade-up">
                <table className="tabla-pkalab">
                    <thead>
                        <tr>
                            <th>DNI</th>
                            <th>Nombre Completo</th>
                            <th>Teléfono</th>
                            <th>Correo</th>
                            <th>Rol</th>
                            <th>Estado</th> {/* <--- AGREGA ESTO */}
                            <th>Registro</th>{/*PARA QUE SALGA LA FECHA Y HORA*/}
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    {/* Busca esta parte en tu tabla y reemplaza el contenido del <tbody> */}
                    <tbody>
                        {usuarios && usuarios
                            // 1. FILTRADO: Filtramos por nombre o DNI
                            .filter(u => {
                                const termino = busqueda.toLowerCase();
                                const nombreCompleto = `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase();
                                const dni = u.dni ? u.dni.toString() : "";
                                return nombreCompleto.includes(termino) || dni.includes(termino);
                            })
                            // 2. ORDENADO: Los más nuevos (createdAt más reciente) arriba
                            .sort((a, b) => {
                                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                            })
                            // 3. MAPEADO: Dibujamos las filas
                            .map(u => (
                                <tr key={u.id} style={{ opacity: u.estado ? 1 : 0.6 }}>
                                    <td><strong>{u.dni}</strong></td>
                                    <td>{u.nombre} {u.apellido}</td>
                                    <td>{u.telefono || '---'}</td>
                                    <td>{u.correo}</td>
                                    <td>{u.rol}</td>

                                    {/* Celda de Fecha de Registro */}
                                    <td>
                                        {u.createdAt ? new Date(u.createdAt).toLocaleString('es-PE', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true // Para que salga en formato AM/PM
                                        }) : '---'}
                                    </td>

                                    <td style={{ textAlign: 'center' }}>
                                        {u.estado ? "✅" : "❌"}
                                    </td>

                                    <td>
                                        {/* Botón Editar */}
                                        <button
                                            className="btn-icon edit"
                                            disabled={!u.estado}
                                            onClick={() => {
                                                const lat = u.ubicacionCasa ? u.ubicacionCasa.coordinates[1] : -12.046374; // centerLima lat
                                                const lng = u.ubicacionCasa ? u.ubicacionCasa.coordinates[0] : -77.042793; // centerLima lng

                                                setFormData({ ...u, latitud: lat, longitud: lng, password: '' });

                                                const elemento = document.getElementById('formulario-registro');
                                                if (elemento) {
                                                    elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                } else {
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }
                                            }}
                                        >
                                            ✏️
                                        </button>

                                        {/* Switch de habilitar/deshabilitar */}
                                        <button
                                            className="btn-icon status"
                                            onClick={() => cambiarEstado(u.id, u.estado)}
                                            title={u.estado ? "Deshabilitar" : "Habilitar"}
                                            style={{ marginLeft: '10px' }}
                                        >
                                            {u.estado ? "🚫" : "✔️"}
                                        </button>

                                        {/* Botón Ver Detalles */}
                                        <button
                                            className="btn-icon view"
                                            onClick={() => verDetalles(u)}
                                            title="Ver Detalles"
                                        >
                                            👁️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
            {usuarioSeleccionado && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Detalles del Personal</h3>
                            <button className="btn-close" onClick={() => setUsuarioSeleccionado(null)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="detail-row"><strong>DNI:</strong> {usuarioSeleccionado.dni}</div>
                            <div className="detail-row"><strong>Nombre:</strong> {usuarioSeleccionado.nombre}</div>
                            <div className="detail-row"><strong>Apellido:</strong> {usuarioSeleccionado.apellido}</div>

                            <div className="detail-row">
                                <strong>Teléfono:</strong> {usuarioSeleccionado.telefono || 'No registrado'}
                                {usuarioSeleccionado.telefono && (
                                    <button
                                        onClick={() => abrirWhatsapp(usuarioSeleccionado.telefono)}
                                        style={{
                                            marginLeft: '10px',
                                            background: '#25D366',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            padding: '2px 8px'
                                        }}
                                    >
                                        WhatsApp 📱
                                    </button>
                                )}
                            </div>

                            <div className="detail-row"><strong>Correo:</strong> {usuarioSeleccionado.correo}</div>
                            <div className="detail-row"><strong>Rol:</strong> {usuarioSeleccionado.rol}</div>

                            <div className="detail-row">
                                <strong>Estado:</strong>
                                <span className={usuarioSeleccionado.estado ? "status-active" : "status-inactive"}>
                                    {usuarioSeleccionado.estado ? " Activo" : " Inactivo"}
                                </span>
                            </div>

                            <div className="detail-row" style={{ marginTop: '10px' }}>
                                <strong>Dirección:</strong>
                                <span style={{ marginLeft: '5px', color: '#555' }}>
                                    {direccionTexto || 'No especificada'}
                                </span>
                            </div>

                            {/* SECCIÓN DE COORDENADAS CON BOTÓN DE MAPS */}
                            <div className="detail-row" style={{ fontSize: '12px', marginTop: '10px', color: '#333', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                <strong>Coordenadas:</strong>
                                <span style={{ marginLeft: '5px' }}>
                                    {usuarioSeleccionado.ubicacionCasa?.coordinates[1]}, {usuarioSeleccionado.ubicacionCasa?.coordinates[0]}
                                </span>

                                {/* Botón Ir a la dirección */}
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${usuarioSeleccionado.ubicacionCasa?.coordinates[1]},${usuarioSeleccionado.ubicacionCasa?.coordinates[0]}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        marginLeft: '10px',
                                        background: '#4285F4',
                                        color: 'white',
                                        textDecoration: 'none',
                                        padding: '4px 10px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        display: 'inline-flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    Ver en Maps 📍
                                </a>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-save" onClick={() => setUsuarioSeleccionado(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )
            }

        </div >
    );
};