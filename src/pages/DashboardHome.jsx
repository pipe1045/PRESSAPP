import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { TrendingUp, Bell, CheckCircle2, XCircle, ChevronDown, ChevronUp, Phone, MessageCircle, Clock, AlertTriangle } from 'lucide-react';

const DashboardHome = () => {
  const [prestamos, setPrestamos] = useState([]);
  const [clientesMap, setClientesMap] = useState({}); // Mapa para cruzar datos frescos de clientes
  const [cargando, setCargando] = useState(true);
  const [clienteExpandido, setClienteExpandido] = useState(null); 
  const [capitalEnCalle, setCapitalEnCalle] = useState(0);
  
  // FILTRO GLOBAL DE FECHA: Inicializa en hoy (Hora Local Colombia)
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // 1. Escuchar la colección de Clientes en tiempo real para reflejar cambios o borrados inmediatamente
    const qClientes = query(collection(db, "clientes"), where("estado", "==", "activo"));
    const unsubscribeClientes = onSnapshot(qClientes, (snapshot) => {
      const mapa = {};
      snapshot.forEach(docSnap => {
        mapa[docSnap.id] = docSnap.data();
      });
      setClientesMap(mapa);
    });

    // 2. Escuchar la colección de Préstamos en curso
    const qPrestamos = query(collection(db, "prestamos"), where("estado", "==", "en curso"));
    const unsubscribePrestamos = onSnapshot(qPrestamos, (snapshot) => {
      const listaPrestamos = [];
      let totalCapital = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;
        
        // Si el cliente fue eliminado de la colección clientes, decidimos si mostrarlo o no de forma segura
        totalCapital += Number(data.totalDeuda || data.montoTotal || 0);
        listaPrestamos.push({ id, ...data });
      });

      setPrestamos(listaPrestamos);
      setCapitalEnCalle(totalCapital);
      setCargando(false);
    });

    return () => {
      unsubscribeClientes();
      unsubscribePrestamos();
    };
  }, []);

  const procesarCobroDiario = async (prestamoId, actualHistorial, actualCuotas, accion) => {
    const prestamoRef = doc(db, "prestamos", prestamoId);
    const hoyStr = new Date().toISOString().split('T')[0];
    
    // Mantiene el filtro limpio de registros duplicados del mismo día
    let nuevoHistorial = (actualHistorial || []).filter(h => h.fecha !== hoyStr);

    if (accion === 'pagado') {
      nuevoHistorial.push({ fecha: hoyStr, estado: 'pagado' });
      await updateDoc(prestamoRef, {
        historialPagos: nuevoHistorial,
        cuotasRestantes: Math.max(0, actualCuotas - 1)
      });
    } else if (accion === 'no-pago') {
      // Registro estricto para clientes que NO cancelaron hoy
      nuevoHistorial.push({ fecha: hoyStr, estado: 'no-pago' });
      await updateDoc(prestamoRef, {
        historialPagos: nuevoHistorial
      });
    }
  };

  // Función para construir enlace automatizado de cobro por WhatsApp
  const generarMensajeWhatsApp = (p) => {
    const telefono = String(p.telefonoCliente || p.telefono || '').replace(/\D/g, '');
    const nombre = p.nombreCliente || "Cliente";
    const cuota = Math.round(p.cuotaDiaria || 0).toLocaleString('es-CO');
    const deuda = Math.round(p.totalDeuda || p.montoTotal || 0).toLocaleString('es-CO');
    
    const mensaje = encodeURIComponent(
      `Hola ${nombre}, te saludamos de Cobranzas Centralizadas. 👋\n\nTe recordamos que tu cuota asignada para el día de hoy es de *$ ${cuota}*. Tu saldo pendiente en sistema es de $ ${deuda}. Por favor nos confirmas tu pago de la ruta. ¡Quedamos atentos! 👍`
    );
    return `https://wa.me/57${telefono}?text=${mensaje}`;
  };

  const realizarLlamadaMinutos = (telefono) => {
    if (!telefono) return;
    const telLimpio = String(telefono).replace(/\D/g, '');
    window.location.href = `tel:${telLimpio}`;
  };

  const alternarAcordon = (id) => {
    setClienteExpandido(clienteExpandido === id ? null : id);
  };

  const hoyStr = new Date().toISOString().split('T')[0];
  const esFechaHoy = fechaFiltro === hoyStr;

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '24px', color: 'white', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#39FF14', fontSize: '32px', fontWeight: '900', marginBottom: '30px', letterSpacing: '-1px' }}>
        PRESAPP PRO
      </h1>
      
      {/* Tarjeta de Saldo Total en Calle */}
      <div style={{ backgroundColor: '#111', padding: '24px', borderRadius: '24px', border: '1px solid rgba(57,255,20,0.15)', marginBottom: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ color: '#666', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Capital Activo en Calle Real</span>
          <TrendingUp size={20} color="#39FF14" />
        </div>
        <div style={{ fontSize: '42px', fontWeight: '900', color: '#fff' }}>
          $ {capitalEnCalle.toLocaleString('es-CO')}
        </div>
        <div style={{ color: '#39FF14', fontSize: '10px', marginTop: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', backgroundColor: '#39FF14', borderRadius: '50%', boxShadow: '0 0 8px #39FF14' }}></div>
          CENTRAL DE TRÁFICO Y CONTROL ACTIVA
        </div>
      </div>

      {/* CONTENEDOR DEL FILTRO CALENDARIO GLOBAL */}
      <div style={{ backgroundColor: '#111', padding: '16px', borderRadius: '20px', border: '1px solid #222', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Clock size={16} color="#39FF14" />
          <label style={{ fontSize: '12px', color: '#39FF14', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Auditoría de Cuotas Global por Fecha:
          </label>
        </div>
        <input 
          type="date" 
          value={fechaFiltro}
          onChange={(e) => setFechaFiltro(e.target.value)}
          style={{ backgroundColor: '#0a0a0a', color: '#fff', border: '1px solid #333', padding: '10px', borderRadius: '10px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }}
        />
      </div>

      <h3 style={{ fontSize: '14px', color: '#888', fontWeight: 'bold', marginBottom: '15px', letterSpacing: '0.5px' }}>
        LISTADO DE COBROS ({prestamos.length}) — {esFechaHoy ? "VISTA HOY" : `AUDITANDO: ${fechaFiltro}`}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {cargando ? (
          <div style={{ color: '#39FF14', fontSize: '14px', textAlign: 'center', padding: '20px' }}>Sincronizando flujos con servidor...</div>
        ) : prestamos.length === 0 ? (
          <div style={{ backgroundColor: '#111', padding: '20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid rgba(255,255,255,0.02)' }}>
            <div style={{ backgroundColor: '#39FF14', padding: '12px', borderRadius: '15px', color: 'black', display: 'flex', alignItems: 'center' }}>
              <Bell size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>Sin registros</div>
              <div style={{ color: '#666', fontSize: '12px' }}>No hay préstamos activos en este momento.</div>
            </div>
          </div>
        ) : (
          prestamos.map((p) => {
            const estaAbierto = clienteExpandido === p.id;
            
            // Evaluamos el estado de la cuota del cliente específico para la fecha seleccionada
            const registroFecha = (p.historialPagos || []).find(h => h.fecha === fechaFiltro);
            const estadoCuota = registroFecha ? (registroFecha.estado || registroFecha.state) : 'pendiente';
            
            // Estilos dinámicos tácticos según la alerta de no pago
            const esIncumplido = estadoCuota === 'no-pago';
            
            return (
              <div 
                key={p.id} 
                style={{ 
                  backgroundColor: '#111', 
                  borderRadius: '20px', 
                  border: esIncumplido ? '1px solid #ff4444' : estaAbierto ? '1px solid #39FF14' : '1px solid #222',
                  boxShadow: esIncumplido ? '0 0 10px rgba(255,68,68,0.15)' : 'none',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Cabecera del Cliente */}
                <div 
                  onClick={() => alternarAcordon(p.id)}
                  style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ backgroundColor: esIncumplido ? 'rgba(255,68,68,0.1)' : 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px', color: esIncumplido ? '#ff4444' : '#aaa' }}>
                      {esIncumplido ? <AlertTriangle size={20} /> : <Bell size={20} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>{p.nombreCliente}</div>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold', marginTop: '2px' }}>
                        {`Cuota: $${Math.round(p.cuotaDiaria).toLocaleString('es-CO')}`}
                      </div>
                    </div>
                  </div>

                  {/* BADGE DE ESTADO GLOBAL SEGÚN LA FECHA DEL CALENDARIO */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '900',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      letterSpacing: '0.5px',
                      backgroundColor: estadoCuota === 'pagado' ? 'rgba(57,255,20,0.1)' : esIncumplido ? 'rgba(255,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                      color: estadoCuota === 'pagado' ? '#39FF14' : esIncumplido ? '#ff4444' : '#888',
                      border: estadoCuota === 'pagado' ? '1px solid rgba(57,255,20,0.2)' : esIncumplido ? '1px solid rgba(255,68,68,0.3)' : '1px solid #333'
                    }}>
                      {estadoCuota === 'pagado' ? 'PAGÓ ✓' : esIncumplido ? 'INCUMPLIDO ✗' : 'PENDIENTE'}
                    </span>
                    {estaAbierto ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                  </div>
                </div>

                {/* Detallado Expandible */}
                {estaAbierto && (
                  <div style={{ padding: '16px', borderTop: '1px solid #222', backgroundColor: '#151515' }}>
                    
                    {/* ACCIONES RÁPIDAS DE CONTACTO */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', background: '#0a0a0a', padding: '10px', borderRadius: '12px', border: '1px solid #222' }}>
                      <button 
                        onClick={() => realizarLlamadaMinutos(p.telefonoCliente)} 
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#0070f3', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}
                      >
                        <Phone size={14} /> LLAMAR MINUTOS
                      </button>
                      <a 
                        href={generarMensajeWhatsApp(p)} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#25D366', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '11px', textDecoration: 'none' }}
                      >
                        <MessageCircle size={14} /> COBRAR WHATSAPP
                      </a>
                    </div>

                    {/* Metadatos Generales */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px', fontSize: '12px' }}>
                      <div><span style={{ color: '#555' }}>Monto Original:</span> <b style={{ color: '#fff' }}>${Math.round(p.monto || p.montoPrestamo || 0).toLocaleString()}</b></div>
                      <div><span style={{ color: '#555' }}>Deuda en Calle:</span> <b style={{ color: '#39FF14' }}>${Math.round(p.totalDeuda || p.montoTotal || 0).toLocaleString()}</b></div>
                      <div><span style={{ color: '#555' }}>Cuotas Pendientes:</span> <b style={{ color: '#fff' }}>{p.cuotasRestantes}</b></div>
                      <div><span style={{ color: '#555' }}>Cédula Ref:</span> <b style={{ color: '#fff' }}>{p.cedulaCliente || 'N/A'}</b></div>
                    </div>

                    {/* BOTONERA OPERATIVA (Solo disponible si se está visualizando el día de HOY) */}
                    {esFechaHoy ? (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button 
                          onClick={() => procesarCobroDiario(p.id, p.historialPagos, p.cuotasRestantes, 'pagado')}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#39FF14', color: '#000', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' }}
                        >
                          <CheckCircle2 size={16} /> VALIDAR PAGO
                        </button>
                        
                        <button 
                          onClick={() => procesarCobroDiario(p.id, p.historialPagos, p.cuotasRestantes, 'no-pago')}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#ff4444', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' }}
                        >
                          <XCircle size={16} /> MARCAR NO PAGO
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '10px', background: '#111', borderRadius: '10px', border: '1px solid #333', fontSize: '11px', color: '#666', fontWeight: 'bold' }}>
                        MODO AUDITORÍA: OPERACIONES DE HOY INACTIVAS EN ESTA FECHA
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DashboardHome;