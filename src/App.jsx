import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PrivateRoute } from "./routes/PrivateRoute";
import Login from "./pages/Login";
import { Principal } from "./pages/Principal";
import { PageUsuarios } from "./pages/PageUsuarios";
import { Inicio } from "./pages/PageInicio";
import { PageTiendas } from "./pages/PageTiendas";
import { PageRequerimientos } from "./pages/PageRequerimientos";
import { PageHorario } from "./pages/PageHorario"; 
// 1. IMPORTA TU NUEVA PÁGINA AQUÍ
import PageAsistencia from "./pages/PageAsistencia"; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />

        <Route path="/dashboard" element={<PrivateRoute><Principal /></PrivateRoute>}>
          <Route index element={<Inicio />} /> 
          
          <Route path="usuarios" element={<PageUsuarios />} />
          
          <Route path="horarios" element={<PageHorario />} />
          
          {/* 2. REGISTRA LA RUTA DE ASISTENCIAS */}
          <Route path="asistencias" element={<PageAsistencia />} /> 
          
          <Route path="importar" element={<PageRequerimientos />} /> 
          <Route path="tiendas" element={<PageTiendas />} /> 
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;