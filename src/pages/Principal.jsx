import { Outlet, useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import "./Principal.css";

export const Principal = () => {
    const { logout, rol, token } = useContext(AuthContext);
    const navigate = useNavigate();

    const [isCollapsed, setIsCollapsed] = useState(false);

    const displayRol = rol || localStorage.getItem("rol") || "Invitado";

    return (
        <div className={`layout-container ${isCollapsed ? "sidebar-collapsed" : ""}`}>

            <button
                className="hamburger-btn"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                {isCollapsed ? "✕" : "☰"}
            </button>
            
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>Pkalab</h2>
                    <p className="rol-badge">{displayRol}</p>
                </div>

                <nav>
                    <button onClick={() => {navigate("/dashboard"); setIsCollapsed(false); }}>
                        🏠 <span>Inicio</span>
                    </button>

                    <button onClick={() => { navigate("/dashboard/usuarios"); setIsCollapsed(false); }}>
                        👥 <span>Usuarios</span>
                    </button>

                    <button onClick={() => {navigate("/dashboard/importar"); setIsCollapsed(false)}}>
                        📥 <span>Importar</span>
                    </button>
                    
                    <button onClick={() => {navigate("/dashboard/horarios"); setIsCollapsed(false)}}>
                        📅 <span>Horarios</span>
                    </button>
                    
                    {/* NUEVA OPCIÓN DE ASISTENCIAS */}
                    <button onClick={() => {navigate("/dashboard/asistencias"); setIsCollapsed(false)}}>
                        ✅ <span>Asistencias</span>
                    </button>
                    
                    <button onClick={() => {navigate("/dashboard/tiendas"); setIsCollapsed(false)}}>
                        🏢 <span>Tiendas</span>
                    </button>
                </nav>

                <button className="btn-logout" onClick={logout}>🚪 <span>Cerrar Sesión</span></button>
            </aside>

            <main className="main-content">
                <Outlet />
                <footer className="footer-token">
                    <small>Token: {token?.substring(0, 20)}...</small>
                </footer>
            </main>
        </div>
    );
};