import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:9090"
});

// Este interceptor pega el token a todas tus llamadas al backend
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token"); // O como lo guardes en tu AuthContext
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;