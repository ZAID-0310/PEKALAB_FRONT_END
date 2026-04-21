import { useState } from "react"
import { AuthContext } from "./AuthContext"

export const AuthProvider = ({children}) => {
    
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    // Añadimos el rol
    const [rol, setRol] = useState(() => localStorage.getItem("rol"));

    const login = (newToken, userRol) => {
        localStorage.setItem("token", newToken);
        localStorage.setItem("rol", userRol); // Guardamos el rol
        setToken(newToken);
        setRol(userRol);
    }

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("rol");
        setToken(null);
        setRol(null);
    }

    return (
        // Ahora pasamos también el rol en el value
        <AuthContext.Provider value={{token, rol, login, logout}}>
            {children}
        </AuthContext.Provider>
    )
}