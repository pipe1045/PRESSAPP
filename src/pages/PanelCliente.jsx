import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Calendar, LogOut, MessageCircle, ShieldCheck } from 'lucide-react';

const PanelCliente = ({ user, setUser }) => {
  const [prestamo, setPrestamo] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const buscarDatos = async () => {
      try {
        const qCliente = query(collection(db, "clientes"), where("cedula", "==", String(user.cedula).trim()));
        const snapCliente = await getDocs(qCliente);

        if (!snapCliente.empty) {
          const qPrestamo = query(
            collection(db, "prestamos"), 
            where("clienteId", "==", snapCliente.docs[0].id),
            where("estado", "==", "en curso")
          );

          return onSnapshot(qPrestamo, (snapshot) => {
            if (!snapshot.empty) {
              setPrestamo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
            }
            setCargando(false);
          });
        }
        setCargando(false);
      } catch (e) { setCargando(false); }
    };
    if (user?.cedula) buscarDatos();
  }, [user.cedula]);

  if (cargando) return <div style={{background: '#000', height: '100vh', color: '#39FF14', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><ShieldCheck className="animate-pulse" /></div>;

  if (!prestamo) return <div style={{background: '#000', height: '100vh', color: '#fff', padding: '40px', textAlign: 'center'}}><h2>SIN PRÉSTAMOS ACTIVOS</h2><button onClick={() => setUser(null)}>SALIR</button></div>;

  // Lógica del Calendario Inteligente
  const renderCalendario = () => {
    const inicio = prestamo.fecha.toDate();
    const historial = prestamo.historialPagos || [];
    const dias = [];
    let tempFecha = new Date(inicio);
    let pagados = 0;
    let i = 0;

    while (pagados < 30 || i < historial.length + 1) {
      const fStr = tempFecha.toISOString().split('T')[0];
      const reg = historial.find(h => h.fecha === fStr);
      let color = '#333'; let bg = '#000'; let border = '#222';

      if (reg?.estado === 'pagado') {
        color = '#39FF14'; bg = 'rgba(57,255,20,0.05)'; border = '#39FF1444';
        pagados++;
      } else if (reg?.estado === 'no-pago') {
        color = '#ff4444'; bg = 'rgba(255,68,68,0.05)'; border = '#ff444444';
      } else if (new Date().toDateString() === tempFecha.toDateString()) {
        color = '#fff'; border = '#39FF14'; // Día actual
      }

      dias.push(
        <div key={i} style={{ background: bg, border: `1px solid ${border}`, color: color, padding: '8px 2px', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{fontSize: '7px', opacity: 0.6}}>{tempFecha.toLocaleDateString('es-CO', {day:'2-digit', month:'short'}).toUpperCase()}</div>
          <div style={{fontSize: '13px', fontWeight: '900'}}>{i + 1}</div>
        </div>
      );
      tempFecha.setDate(tempFecha.getDate() + 1);
      i++;
      if (i > 100) break;
    }
    return dias;
  };

  return (
    <div style={{ backgroundColor: '#070707', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontWeight: '900', color: '#39FF14' }}>{prestamo.nombreCliente}</h2>
        <LogOut onClick={() => setUser(null)} color="#ff4444" />
      </div>

      <div style={{ background: '#111', padding: '20px', borderRadius: '25px', border: '1px solid #222', marginBottom: '20px' }}>
        <p style={{ fontSize: '10px', color: '#555' }}>DEUDA ACTUAL</p>
        <h1 style={{ fontSize: '32px', color: '#39FF14', fontWeight: '900' }}>$ {Math.round(prestamo.montoTotal).toLocaleString()}</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '12px' }}>
          <span>CUOTA: $ {Math.round(prestamo.cuotaDiaria).toLocaleString()}</span>
          <span>RESTAN: {prestamo.cuotasRestantes}</span>
        </div>
      </div>

      <div style={{ background: '#111', padding: '15px', borderRadius: '20px', border: '1px solid #222' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', alignItems: 'center' }}>
          <Calendar size={16} color="#39FF14" /> <span style={{fontSize: '12px'}}>TU CALENDARIO DE PAGOS</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {renderCalendario()}
        </div>
      </div>

      <a href="https://wa.me/573100000000" style={{ display: 'flex', background: '#39FF14', color: '#000', padding: '18px', borderRadius: '15px', marginTop: '20px', fontWeight: '900', textDecoration: 'none', justifyContent: 'center' }}>
        <MessageCircle size={20} style={{marginRight: '10px'}}/> REPORTAR MI PAGO
      </a>
    </div>
  );
};

export default PanelCliente;