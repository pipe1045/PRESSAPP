import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login'; // <--- IMPORTANTE: Tu componente de Login
import DashboardHome from './pages/DashboardHome';
import DashboardCobrador from './pages/DashboardCobrador';
import Caja from './pages/Caja'; 
import FlujoCaja from './pages/FlujoCaja';
import PanelCliente from './pages/PanelCliente';

function App() {
  // 1. Iniciamos en null para que NO cargue el sistema antes del Login
  const [user, setUser] = useState(null);

  // 2. Si NO hay usuario, solo renderizamos el Login y nada más
  if (!user) {
    return <Login setUser={setUser} />;
  }

  return (
    <Router>
      <div className="bg-[#0a0a0a] min-h-screen text-white pb-24">
        <Routes>
          {/* VISTA PARA ADMINISTRADOR / COBRADOR */}
          {(user.rol === 'admin' || user.rol === 'cobrador') && (
            <>
              <Route path="/home" element={<DashboardHome user={user} />} />
              <Route path="/cobrador" element={<DashboardCobrador user={user} />} />
              <Route path="/caja" element={<Caja user={user} />} />
              <Route path="/flujocaja" element={<FlujoCaja user={user} />} />
              <Route path="*" element={<Navigate to="/home" />} />
            </>
          )}

          {/* VISTA EXCLUSIVA PARA CLIENTE */}
          {user.rol === 'cliente' && (
            <>
              <Route path="/micuenta" element={<PanelCliente user={user} setUser={setUser} />} />
              <Route path="*" element={<Navigate to="/micuenta" />} />
            </>
          )}
        </Routes>
        
        {/* El Navbar solo aparece si eres del equipo de trabajo */}
        {(user.rol === 'admin' || user.rol === 'cobrador') && <Navbar />}
      </div>
    </Router>
  );
}

export default App;