import React from 'react';
import { TrendingUp, Bell } from 'lucide-react';

const DashboardHome = () => {
  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '24px', color: 'white', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#39FF14', fontSize: '32px', fontWeight: '900', marginBottom: '30px', letterSpacing: '-1px' }}>
        PRESAPP
      </h1>
      
      {/* Tarjeta de Saldo */}
      <div style={{ backgroundColor: '#1a1a1a', padding: '24px', borderRadius: '24px', border: '1px solid rgba(57,255,20,0.2)', marginBottom: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Capital en Calle</span>
          <TrendingUp size={20} color="#39FF14" />
        </div>
        <div style={{ fontSize: '48px', fontWeight: '900' }}>$0.00</div>
        <div style={{ color: '#39FF14', fontSize: '10px', marginTop: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '8px', height: '8px', backgroundColor: '#39FF14', borderRadius: '50%' }}></div>
          SISTEMA EN LÍNEA
        </div>
      </div>

      {/* Alerta de Bienvenida */}
      <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ backgroundColor: '#39FF14', padding: '12px', borderRadius: '15px', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={24} />
        </div>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Bienvenido, Andres Amaya</div>
          <div style={{ color: '#888', fontSize: '12px' }}>No hay cobros para hoy.</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;