import './PageInicio.css'
export const Inicio = () => {
    const fecha = new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="inicio-container">
            <header className="header-inicio">
                <h1>Hola, bienvenido a Pkalab 👋</h1>
                <p className="fecha">{fecha}</p>
            </header>

            <section className="seccion-horarios">
                <h2>📅 Horarios de la Semana</h2>
                <div className="grilla-horarios">
                    {/* Aquí irá tu lógica para mostrar los horarios de todos */}
                    <p>Cargando cuadrante de personal...</p>
                </div>
            </section>
        </div>
    );
};