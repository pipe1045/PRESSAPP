import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { TrendingUp, Bell, CheckCircle2, XCircle, ChevronDown, ChevronUp, Phone, MessageCircle, Clock, AlertTriangle, Users, Eye } from 'lucide-react';

const DashboardHome = () => {
  const [prestamos, setPrestamos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [clienteExpandido, setClienteExpandido] = useState(null); 
  const [capitalEnCalle, setCapitalEnCalle] = useState(0);
  
  // Lista de clientes colgados con más de 2 cuotas sin pagar
  const [clientesMorosos, setClientesMorosos] = useState([]);
  const [mostrarModalMorosos, setMostrarModalMorosos] = useState(false);
  
  // FILTRO GLOBAL DE FECHA: Inicializa en hoy (Formato YYYY-MM-DD local)
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // 1. Escuchamos primero los clientes activos
    const qClientes = query(collection(db, "clientes"), where("estado", "==", "activo"));
    
    const unsubscribe = onSnapshot(qClientes, (snapshotClientes) => {
      const clientesActivosNombres = new Set();
      snapshotClientes.forEach(docSnap => {
        const data = docSnap.data();
        if (data.nombre) {
          clientesActivosNombres.add(data.nombre.trim().toLowerCase());
        }
      });

      // 2. Escuchamos los préstamos en curso e interceptamos en tiempo real
      const qPrestamos = query(collection(db, "prestamos"), where("estado", "==", "en curso"));
      
      const unsubscribePrestamos = onSnapshot(qPrestamos, (snapshotPrestamos) => {
        const listaFiltrada = [];
        const morososDetectados = [];
        let totalCapital = 0;

        snapshotPrestamos.forEach((docSnap) => {
          const data = docSnap.data();
          const id = docSnap.id;
          const nombrePrestamo = data.nombreCliente ? data.nombreCliente.trim().toLowerCase() : "";

          // VALIDACIÓN ESTRICTA: Solo clientes activos
          if (clientesActivosNombres.has(nombrePrestamo)) {
            totalCapital += Number(data.totalDeuda || data.montoTotal || 0);
            listaFiltrada.push({ id, ...data });

            // AUDITORÍA DE MOROSIDAD: Contamos cuántas cuotas tienen estado 'no-pago' en su historial
            const historial = data.historialPagos || [];
            const cuotasNoPagadas = historial.filter(h => h.estado === 'no-pago' || h.state === 'no-pago').length;

            // Si debe más de 2 cuotas, lo mandamos a la lista de alerta crítica
            if (cuotasNoPagadas >= 2) {
              morososDetectados.push({
                id,
                nombre: data.nombreCliente,
                cuotasAtrasadas: cuotasNoPagadas,
                telefono: data.telefonoCliente || data.telefono
              });
            }
          }
        });

        setPrestamos(listaFiltrada);
        setCapitalEnCalle(totalCapital);
        setClientesMorosos(morososDetectados);
        setCargando(false);
      });

      return () => unsubscribePrestamos();
    });

    return () => unsubscribe();
  }, []);

  const procesarCobroDiario = async (prestamoId, actualHistorial, actualCuotas, accion) => {
    const prestamoRef = doc(db, "prestamos", prestamoId);
    const hoyStr = new Date().toISOString().split('T')[0];
    
    let nuevoHistorial = (actualHistorial || []).filter(h => h.fecha !== hoyStr);

    if (accion === 'pagado') {
      nuevoHistorial.push({ fecha: hoyStr, estado: 'pagado' });
      await updateDoc(prestamoRef, {
        historialPagos: nuevoHistorial,
        cuotasRestantes: Math.max(0, actualCuotas - 1)
      });
    } else if (accion === 'no-pago') {
      nuevoHistorial.push({ fecha: hoyStr, estado: 'no-pago' });
      await updateDoc(prestamoRef, {
        historialPagos: nuevoHistorial
      });
    }
  };

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
      
      {/* HEADER DE LA APP */}
      <h1 style={{ color: '#39FF14', fontSize: '32px', fontWeight: '900', marginBottom: '20px', letterSpacing: '-1px' }}>
        PRESAPP PRO
      </h1>

      {/* 🚨 ALERTA EMERGENTE / BANNER CRÍTICO DE CLIENTES COLGADOS */}
      {clientesMorosos.length > 0 && (
        <div style={{ 
          backgroundColor: 'rgba(255, 68, 68, 0.1)', 
          border: '2px dashed #ff4444', 
          borderRadius: '20px', 
          padding: '16px', 
          marginBottom: '20px',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          boxShadow: '0 0 15px rgba(255, 68, 68, 0.2)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#ff4444', padding: '8px', borderRadius: '50%', color: 'white' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: '900', color: '#ff4444', fontSize: '14px' }}>¡ALERTA DE RECAUDO!</div>
              <div style={{ color: '#aaa', fontSize: '12px' }}>Hay <b>{clientesMorosos.length}</b> clientes con +2 cuotas sin cancelar.</div>
            </div>
          </div>
          <button 
            onClick={() => setMostrarModalMorosos(true)}
            style={{ backgroundColor: '#ff4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Eye size={14} /> REVISAR
          </button>
        </div>
      )}
      
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
          CENTRAL DE TRÁFICO Y CONTROL DE FLUJOS ACTIVA
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

      {/* LISTA PRINCIPAL DE COBROS */}
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
              <div style={{ color: '#666', fontSize: '12px' }}>No hay cobros activos vinculados a clientes para esta sección.</div>
            </div>
          </div>
        ) : (
          prestamos.map((p) => {
            const estaAbierto = clienteExpandido === p.id;
            const registroFecha = (p.historialPagos || []).find(h => h.fecha === fechaFiltro);
            const estadoCuota = registroFecha ? (registroFecha.estado || registroFecha.state) : 'pendiente';
            const esIncumplido = estadoCuota === 'no-pago';
            
            // Verificamos si este cliente específico pertenece a la lista de morosos (+2 sin pagar totales)
            const esMorosoCritico = clientesMorosos.some(m => m.id === p.id);

            return (
              <div 
                key={p.id} 
                style={{ 
                  backgroundColor: '#111', 
                  borderRadius: '20px', 
                  border: esIncumplido ? '1px solid #ff4444' : esMorosoCritico ? '1px solid #ffaa00' : estaAbierto ? '1px solid #39FF14' : '1px solid #222',
                  boxShadow: esIncumplido ? '0 0 12px rgba(255,68,68,0.2)' : esMorosoCritico ? '0 0 10px rgba(255,170,0,0.1)' : 'none',
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
                    <div style={{ backgroundColor: esIncumplido ? 'rgba(255,68,68,0.1)' : esMorosoCritico ? 'rgba(255,170,0,0.1)' : 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px', color: esIncumplido ? '#ff4444' : esMorosoCritico ? '#ffaa00' : '#aaa' }}>
                      {esIncumplido || esMorosoCritico ? <AlertTriangle size={20} /> : <Bell size={20} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>{p.nombreCliente}</div>
                        {esMorosoCritico && <span style={{ backgroundColor: '#ff4444', color: 'white', fontSize: '9px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px' }}>ALERTA ROJA</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold', marginTop: '2px' }}>
                        {`Cuota: $${Math.round(p.cuotaDiaria).toLocaleString('es-CO')}`}
                      </div>
                    </div>
                  </div>

                  {/* BADGE DE ESTADO DINÁMICO */}
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
                      {estadoCuota === 'pagado' ? 'PAGÓ ✓' : estadoCuota === 'no-pago' ? 'INCUMPLIDO ✗' : 'PENDIENTE'}
                    </span>
                    {estaAbierto ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                  </div>
                </div>

                {/* Detallado Expandible */}
                {estaAbierto && (
                  <div style={{ padding: '16px', borderTop: '1px solid #222', backgroundColor: '#151515' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', background: '#0a0a0a', padding: '10px', borderRadius: '12px', border: '1px solid #222' }}>
                      <button onClick={() => realizarLlamadaMinutos(p.telefonoCliente)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#0070f3', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}><Phone size={14} /> LLAMAR MINUTOS</button>
                      <a href={generarMensajeWhatsApp(p)} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#25D366', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '11px', textDecoration: 'none' }}><MessageCircle size={14} /> COBRAR WHATSAPP</a>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px', fontSize: '12px' }}>
                      <div><span style={{ color: '#555' }}>Monto Original:</span> <b style={{ color: '#fff' }}>${Math.round(p.monto || p.montoPrestamo || 0).toLocaleString()}</b></div>
                      <div><span style={{ color: '#555' }}>Deuda en Calle:</span> <b style={{ color: '#39FF14' }}>${Math.round(p.totalDeuda || p.montoTotal || 0).toLocaleString()}</b></div>
                      <div><span style={{ color: '#555' }}>Cuotas Pendientes:</span> <b style={{ color: '#fff' }}>{p.cuotasRestantes}</b></div>
                      <div><span style={{ color: '#ff4444', fontWeight: 'bold' }}>Cuotas No Pagadas:</span> <b style={{ color: '#ff4444' }}>{(p.historialPagos || []).filter(h => h.estado === 'no-pago').length} días</b></div>
                    </div>

                    {esFechaHoy ? (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button onClick={() => procesarCobroDiario(p.id, p.historialPagos, p.cuotasRestantes, 'pagado')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#39FF14', color: '#000', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' }}><CheckCircle2 size={16} /> VALIDAR PAGO</button>
                        <button onClick={() => procesarCobroDiario(p.id, p.historialPagos, p.cuotasRestantes, 'no-pago')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#ff4444', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' }}><XCircle size={16} /> MARCAR NO PAGO</button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '10px', background: '#111', borderRadius: '10px', border: '1px solid #333', fontSize: '11px', color: '#666', fontWeight: 'bold' }}>MODO AUDITORÍA INACTIVO</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 🧾 VENTANA EMERGENTE (MODAL) DE REPORTES DE MOROSIDAD */}
      {mostrarModalMorosos && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #ff4444', borderRadius: '24px', padding: '24px', width: '100%', Jacked: true, maxWidth: '450px', boxShadow: '0 10px 40px rgba(255,68,68,0.2)' }}>
            <h2 style={{ color: '#ff4444', fontWeight: '900', fontSize: '20px', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle color="#ff4444" /> REPORTE CRÍTICO DE RUTA
            </h2>
            <p style={{ color: '#666', fontSize: '12px', marginBottom: '20px' }}>Clientes activos que superan el límite tolerable de atrasos.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
              {clientesMorosos.map(m => (
                <div key={m.id} style={{ backgroundColor: '#0a0a0a', padding: '12px', borderRadius: '14px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{m.nombre}</div>
                    <div style={{ color: '#ff4444', fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>⚠️ Debe {m.cuotasAtrasadas} cuotas diarias</div>
                  </div>
                  <a href={`https://wa.me/57${String(m.telefono).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ backgroundColor: '#25D366', color: 'white', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
                    <MessageCircle size={16} />
                  </a>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setMostrarModalMorosos(false)}
              style={{ width: '100%', backgroundColor: '#222', color: '#fff', border: 'none', padding: '12px', borderRadius: '14px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              ENTENDIDO Y CERRAR
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardHome;