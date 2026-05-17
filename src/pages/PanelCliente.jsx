import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Calendar, LogOut, MessageCircle, ShieldCheck, KeyRound, QrCode, Lock, Check } from 'lucide-react';

const PanelCliente = ({ user, setUser }) => {
  const [clienteDocId, setClienteDocId] = useState(null);
  const [clienteData, setClienteData] = useState(null);
  const [prestamo, setPrestamo] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Estados para manejo del PIN de seguridad
  const [pinIngresado, setPinIngresado] = useState('');
  const [pinValidado, setPinValidado] = useState(false);
  
  // Estados para creación inicial (Primer ingreso)
  const [nuevoPin, setNuevoPin] = useState('');
  const [confirmarPin, setConfirmarPin] = useState('');
  const [errorPin, setErrorPin] = useState('');

  useEffect(() => {
    const buscarDatos = async () => {
      try {
        const qCliente = query(collection(db, "clientes"), where("cedula", "==", String(user.cedula).trim()));
        const snapCliente = await getDocs(qCliente);

        if (!snapCliente.empty) {
          const docId = snapCliente.docs[0].id;
          const dataCliente = snapCliente.docs[0].data();
          setClienteDocId(docId);
          setClienteData(dataCliente);

          // Si el cliente NO tiene PIN (es la primera vez), no bloqueamos con el formulario de login normal
          if (!dataCliente.pin) {
            setPinValidado(false);
          }

          const qPrestamo = query(
            collection(db, "prestamos"), 
            where("clienteId", "==", docId),
            where("estado", "==", "en curso")
          );

          const unsubscribe = onSnapshot(qPrestamo, (snapshot) => {
            if (!snapshot.empty) {
              setPrestamo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
            } else {
              setPrestamo(null);
            }
            setCargando(false);
          });

          return unsubscribe;
        } else {
          setCargando(false);
        }
      } catch (e) { 
        console.error("Error al obtener datos:", e);
        setCargando(false); 
      }
    };
    if (user?.cedula) buscarDatos();
  }, [user.cedula]);

  // Función para registrar el PIN por primera y única vez
  const manejarRegistroInicialPin = async (e) => {
    e.preventDefault();
    setErrorPin('');

    if (nuevoPin.length !== 4 || confirmarPin.length !== 4) {
      setErrorPin('El PIN debe tener exactamente 4 dígitos.');
      return;
    }
    if (nuevoPin !== confirmarPin) {
      setErrorPin('Los códigos PIN no coinciden.');
      return;
    }

    try {
      setCargando(true);
      const clienteRef = doc(db, "clientes", clienteDocId);
      
      // Guardamos el PIN de forma definitiva en Firestore
      await updateDoc(clienteRef, { pin: nuevoPin });
      
      setClienteData(prev => ({ ...prev, pin: nuevoPin }));
      setPinValidado(true); // Se le da acceso inmediato tras crearlo
      setCargando(false);
    } catch (err) {
      console.error(err);
      setErrorPin('Error en la base de datos al guardar tu PIN.');
      setCargando(false);
    }
  };

  // Función para validar el PIN en los ingresos subsiguientes
  const manejarLoginPin = (e) => {
    e.preventDefault();
    setErrorPin('');

    if (pinIngresado === clienteData.pin) {
      setPinValidado(true);
    } else {
      setErrorPin('PIN incorrecto. Acceso denegado.');
      setPinIngresado('');
    }
  };

  if (cargando) return <div style={{background: '#000', height: '100vh', color: '#39FF14', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><ShieldCheck className="animate-pulse" /></div>;

  // 1. VISTA DE PRIMER INGRESO: Si la cuenta existe pero no se ha configurado un PIN
  if (clienteData && !clienteData.pin) {
    return (
      <div style={{ backgroundColor: '#070707', minHeight: '100vh', color: '#fff', padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#111', padding: '30px', borderRadius: '25px', border: '1px solid #39FF14', textAlign: 'center', maxWidth: '400px', margin: '0 auto', boxShadow: '0 0 20px rgba(57,255,20,0.1)' }}>
          <KeyRound size={40} color="#39FF14" style={{ margin: '0 auto 15px' }} />
          <h2 style={{ fontWeight: '900', fontSize: '20px', margin: '0 0 10px 0', letterSpacing: '1px' }}>CREAR TU PIN</h2>
          <p style={{ color: '#888', fontSize: '13px', marginBottom: '20px' }}>Esta contraseña de 4 dígitos será requerida para cada ingreso futuro y no podrá modificarse.</p>
          
          <form onSubmit={manejarRegistroInicialPin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '10px', color: '#39FF14', fontWeight: 'bold' }}>NUEVO PIN DE 4 DÍGITOS</label>
              <input 
                type="password" 
                maxLength={4}
                pattern="\d*"
                inputMode="numeric"
                value={nuevoPin}
                onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                style={{ width: '100%', background: '#000', border: '1px solid #222', borderRadius: '12px', padding: '12px', color: '#39FF14', textAlign: 'center', fontSize: '20px', letterSpacing: '8px', marginTop: '5px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '10px', color: '#888', fontWeight: 'bold' }}>CONFIRMAR TU PIN</label>
              <input 
                type="password" 
                maxLength={4}
                pattern="\d*"
                inputMode="numeric"
                value={confirmarPin}
                onChange={(e) => setConfirmarPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                style={{ width: '100%', background: '#000', border: '1px solid #222', borderRadius: '12px', padding: '12px', color: '#39FF14', textAlign: 'center', fontSize: '20px', letterSpacing: '8px', marginTop: '5px', boxSizing: 'border-box' }}
              />
            </div>

            {errorPin && <p style={{ color: '#ff4444', fontSize: '12px', margin: '5px 0 0 0', fontWeight: 'bold' }}>{errorPin}</p>}

            <button 
              type="submit"
              style={{ background: '#39FF14', color: '#000', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Lock size={16} /> GUARDAR PIN DE ACCESO
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. VISTA DE INGRESO HABITUAL: Si ya tiene PIN pero aún no lo ha ingresado correctamente en esta sesión
  if (clienteData && clienteData.pin && !pinValidado) {
    return (
      <div style={{ backgroundColor: '#070707', minHeight: '100vh', color: '#fff', padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#111', padding: '30px', borderRadius: '25px', border: '1px solid #222', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
          <Lock size={40} color="#39FF14" style={{ margin: '0 auto 15px' }} />
          <h2 style={{ fontWeight: '900', fontSize: '20px', margin: '0 0 5px 0', color: '#fff' }}>VERIFICACIÓN DE SEGURIDAD</h2>
          <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>Ingresa tu PIN de 4 dígitos asignado.</p>
          
          <form onSubmit={manejarLoginPin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="password" 
              maxLength={4}
              pattern="\d*"
              inputMode="numeric"
              value={pinIngresado}
              onChange={(e) => setPinIngresado(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              style={{ width: '100%', background: '#000', border: '1px solid #222', borderRadius: '12px', padding: '12px', color: '#39FF14', textAlign: 'center', fontSize: '22px', letterSpacing: '8px', boxSizing: 'border-box' }}
            />

            {errorPin && <p style={{ color: '#ff4444', fontSize: '12px', margin: '0', fontWeight: 'bold' }}>{errorPin}</p>}

            <button 
              type="submit"
              style={{ background: '#39FF14', color: '#000', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', cursor: 'pointer' }}
            >
              INGRESAR AL PANEL
            </button>
            
            <button 
              type="button" 
              onClick={() => setUser(null)}
              style={{ background: 'transparent', color: '#ff4444', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}
            >
              CANCELAR
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. VALIDACIÓN DE PRÉSTAMO ACTIVO
  if (!prestamo) return <div style={{background: '#000', height: '100vh', color: '#fff', padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}><h2 style={{fontWeight: '900', color: '#ff4444'}}>SIN PRÉSTAMOS ACTIVOS</h2><button onClick={() => setUser(null)} style={{background: '#222', border: 'none', color: '#fff', padding: '12px 25px', borderRadius: '12px', marginTop: '15px', fontWeight: 'bold'}}>SALIR</button></div>;

  // Lógica del Calendario Inteligente (Verde: pagado / Rojo: no-pago)
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
        color = '#fff'; border = '#39FF14'; // Día actual sin registrar todavía
      }

      dias.push(
        <div key={i} style={{ background: bg, border: `1px solid ${border}`, color: color, padding: '8px 2px', borderRadius: '10px', textAlign: 'center', transition: 'all 0.3s' }}>
          <div style={{fontSize: '7px', opacity: 0.6}}>{tempFecha.toLocaleDateString('es-CO', {day:'2-digit', month:'short'}).toUpperCase()}</div>
          <div style={{fontSize: '13px', fontWeight: '900'}}>{i + 1}</div>
        </div>
      );
      tempFecha.setDate(tempFecha.getDate() + 1);
      i++;
      if (i > 100) break; // Control anti bucles infinitos
    }
    return dias;
  };

  return (
    <div style={{ backgroundColor: '#070707', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
        <h2 style={{ fontWeight: '900', color: '#39FF14', margin: 0, fontSize: '20px' }}>{prestamo.nombreCliente}</h2>
        <LogOut onClick={() => setUser(null)} color="#ff4444" style={{ cursor: 'pointer' }} />
      </div>

      {/* RESUMEN DEUDA */}
      <div style={{ background: '#111', padding: '20px', borderRadius: '25px', border: '1px solid #222', marginBottom: '20px' }}>
        <p style={{ fontSize: '10px', color: '#555', margin: '0 0 5px 0', fontWeight: 'bold' }}>DEUDA ACTUAL</p>
        <h1 style={{ fontSize: '32px', color: '#39FF14', fontWeight: '900', margin: 0 }}>$ {Math.round(prestamo.montoTotal).toLocaleString()}</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '12px', color: '#aaa' }}>
          <span>CUOTA: <b style={{color: '#fff'}}>$ {Math.round(prestamo.cuotaDiaria).toLocaleString()}</b></span>
          <span>RESTAN: <b style={{color: '#fff'}}>{prestamo.cuotasRestantes}</b></span>
        </div>
      </div>

      {/* CALENDARIO INTERACTIVO */}
      <div style={{ background: '#111', padding: '15px', borderRadius: '20px', border: '1px solid #222', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', alignItems: 'center' }}>
          <Calendar size={16} color="#39FF14" /> <span style={{fontSize: '12px', fontWeight: 'bold', color: '#aaa'}}>TU CALENDARIO DE PAGOS</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {renderCalendario()}
        </div>
      </div>

      {/* SECCIÓN DE PAGO CON QR INTEGRADO */}
      <div style={{ background: '#111', padding: '20px', borderRadius: '25px', border: '1px solid #222', textAlign: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '15px' }}>
          <QrCode size={18} color="#39FF14" />
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#aaa' }}>PAGO RÁPIDO DESDE LA APP</span>
        </div>

        {/* CONTENEDOR DEL QR */}
        <div style={{ background: '#fff', width: '180px', height: '180px', margin: '0 auto 15px', borderRadius: '15px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img 
            src="/qr-pago.png" 
            alt="Código QR de Pago" 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentNode.innerHTML = '<span style="color:#000; font-size:11px; font-weight:bold;">[ TU IMAGEN QR AQUÍ ]<br/>Guarda tu QR en public/qr-pago.png</span>';
            }}
          />
        </div>
        <p style={{ fontSize: '11px', color: '#666', margin: '0 0 5px 0' }}>Escanea, realiza tu transferencia por el valor de la cuota</p>
        <p style={{ fontSize: '11px', color: '#39FF14', fontWeight: 'bold', margin: '0 0 15px 0' }}>¡Y repórtalo de inmediato abajo!</p>

        {/* BOTÓN WHATSAPP */}
        <a 
          href="https://wa.me/573124085006?text=Hola,%20acabo%20de%20realizar%20el%20pago%20de%20mi%20cuota.%20Adjunto%20el%20comprobante." 
          target="_blank"
          rel="noreferrer"
          style={{ display: 'flex', background: '#39FF14', color: '#000', padding: '16px', borderRadius: '15px', fontWeight: '900', textDecoration: 'none', justifyContent: 'center', alignItems: 'center', fontSize: '14px', boxShadow: '0 5px 15px rgba(57,255,20,0.2)' }}
        >
          <MessageCircle size={20} style={{marginRight: '10px'}}/> ENVIAR COMPROBANTE
        </a>
      </div>
    </div>
  );
};

export default PanelCliente;