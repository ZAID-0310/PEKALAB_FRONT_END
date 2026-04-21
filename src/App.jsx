import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PrivateRoute } from "./routes/PrivateRoute";
import Login from "./pages/Login";
import { Principal } from "./pages/Principal";
import { PageUsuarios } from "./pages/PageUsuarios";
import { Inicio } from "./pages/PageInicio";
import { PageTiendas } from "./pages/PageTiendas";
import {PageRequerimientos} from"./pages/PageRequerimientos";
import { PageHorario } from "./pages/PageHorario"; // Revisa que la ruta sea correcta
// Asegúrate de que este nombre sea correcto
// Asegúrate de importar PaginaImportar si la vas a usar
// import { PaginaImportar } from "./pages/PaginaImportar"; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />

        <Route path="/dashboard" element={<PrivateRoute><Principal /></PrivateRoute>}>
          <Route index element={<Inicio />} /> 
        
          <Route path="usuarios" element={<PageUsuarios />} />
          
          {/* 2. CAMBIA ESTA LÍNEA: Quita el <div> y pon el componente */}
          <Route path="horarios" element={<PageHorario />} />
          
          <Route path="importar" element={<PageRequerimientos/>} /> 
          <Route path="tiendas" element={<PageTiendas/>}/> 
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;