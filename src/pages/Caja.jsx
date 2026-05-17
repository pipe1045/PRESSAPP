import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { 
  Wallet, ArrowUpCircle, TrendingUp, PieChart as PieIcon, 
  DollarSign, Activity, Zap, ShieldCheck, BarChart3, 
  AlertCircle, X, MessageCircle, Share2, ExternalLink, Clock
} from 'lucide-react';

const Caja = () => {
  const [metricas, setMetricas] = useState({
    totalInvertido: 0,
    totalRecaudado: 0,
    pendientes: 0,
    clientesActivos: 0,
    gananciaIntereses: 0,
    capitalBase: 0,
    efectividadCobro: 0,
    moraCritica: 0,
    proximoCobro: 0
  });

  const [morosos, setMorosos] = useState([]);
  const [showMorososModal, setShowMorososModal] = useState(false);

  useEffect(() => {
    const qPrestamos = query(collection(db, "prestamos"));
    const unsubscribePrestamos = onSnapshot(qPrestamos, (snapshot) => {
      let totalContratos = 0;      
      let capitalPuroInvertido = 0; 
      let deudaActualCalle = 0;    
      let recaudadoHistorico = 0;  
      let listaMorosos = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        const montoTotalConInteres = parseFloat(data.montoTotal || 0);
        const capitalInicial = parseFloat(data.monto || 0);
        const deudaPendiente = parseFloat(data.totalDeuda || 0);

        totalContratos += montoTotalConInteres;
        capitalPuroInvertido += capitalInicial;
        
        if (data.estado !== 'finalizado') {
          deudaActualCalle += deudaPendiente;
          // Criterio de mora: flag activo o más de 1 día de retraso con saldo pendiente
          if (data.enMora || (data.diasRetraso > 1 && deudaPendiente > 0)) {
            listaMorosos.push({ id: doc.id, ...data });
          }
        }
        recaudadoHistorico += (montoTotalConInteres - deudaPendiente);
      });

      const interesesTotales = totalContratos - capitalPuroInvertido;
      const efectividad = totalContratos > 0 ? (recaudadoHistorico / totalContratos) * 100 : 0;

      setMorosos(listaMorosos);
      setMetricas(prev => ({
        ...prev,
        totalInvertido: totalContratos,
        totalRecaudado: recaudadoHistorico,
        pendientes: deudaActualCalle,
        gananciaIntereses: interesesTotales,
        capitalBase: capitalPuroInvertido,
        efectividadCobro: efectividad,
        moraCritica: listaMorosos.length,
        proximoCobro: deudaActualCalle * 0.1 // Estimación de recaudo del 10%
      }));
    });

    const qClientes = query(collection(db, "clientes"));
    const unsubscribeClientes = onSnapshot(qClientes, (snapshot) => {
      let activos = 0;
      snapshot.forEach(doc => {
        if (doc.data().estado === 'activo') activos++;
      });
      setMetricas(prev => ({ ...prev, clientesActivos: activos }));
    });

    return () => {
      unsubscribePrestamos();
      unsubscribeClientes();
    };
  }, []);

  const f = (num) => `$ ${Math.round(num).toLocaleString()}`;

  // FUNCIÓN: Generar link con mensaje automático de cobro
  const generarLinkWhatsApp = (cliente) => {
    const nombre = cliente.nombreCliente || "Cliente";
    const deuda = f(cliente.totalDeuda);
    const mensaje = encodeURIComponent(
      `Hola ${nombre}, te saludamos de Cobranzas. 👋 \n\nTe recordamos que presentas un saldo pendiente de ${deuda}. Por favor, confírmanos tu pago para evitar cargos adicionales. Quedamos atentos. 👍`
    );
    return `https://wa.me/57${cliente.telefono}?text=${mensaje}`;
  };

  const generarCorteCaja = () => {
    const fecha = new Date().toLocaleDateString();
    const reporte = `📊 *CORTE DE CAJA - ${fecha}*\n--------------------------------\n💰 *Capital en Calle:* ${f(metricas.pendientes)}\n📈 *Inversión Base:* ${f(metricas.capitalBase)}\n💵 *Utilidad Proyectada:* ${f(metricas.gananciaIntereses)}\n✅ *Total Recaudado:* ${f(metricas.totalRecaudado)}\n--------------------------------\n👥 *Clientes Activos:* ${metricas.clientesActivos}\n⚠️ *Cuentas en Mora:* ${metricas.moraCritica}\n--------------------------------\n💡 _Generado por Sistema Core Finance_`;

    if (navigator.share) {
      navigator.share({ title: 'Corte de Caja', text: reporte });
    } else {
      navigator.clipboard.writeText(reporte);
      alert("✅ Reporte copiado al portapapeles.");
    }
  };

  const cardStyle = {
    background: '#111',
    padding: '20px',
    borderRadius: '25px',
    border: '1px solid rgba(57,255,20,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
    position: 'relative',
    overflow: 'hidden'
  };

  const labelStyle = { color: '#666', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' };
  const valueStyle = { color: '#fff', fontSize: '24px', fontWeight: '900', letterSpacing: '1px' };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '20px', paddingBottom: '120px', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* 1. ALERTA DE MORA TÁCTICA (Trigger del Cobro) */}
      {metricas.moraCritica > 0 && (
        <div 
          onClick={() => setShowMorososModal(true)}
          style={{ background: 'rgba(255,0,0,0.1)', border: '2px solid #ff4444', padding: '15px', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle color="#ff4444" size={20} />
            <div>
                <div style={{ color: '#ff4444', fontSize: '13px', fontWeight: '900' }}>{metricas.moraCritica} CUENTAS EN RIESGO</div>
                <div style={{ color: '#666', fontSize: '10px', fontWeight: 'bold' }}>HAZ CLIC PARA GESTIONAR COBRO</div>
            </div>
          </div>
          <ExternalLink color="#ff4444" size={18} />
        </div>
      )}

      {/* HEADER TÉCNICO */}
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
            <Zap size={18} color="#39FF14" />
            <h2 style={{ color: '#39FF14', fontWeight: '900', margin: 0, letterSpacing: '3px', fontSize: '20px' }}>CAJA FINACIERA</h2>
        </div>
        <span style={{ color: '#444', fontSize: '10px', fontWeight: 'bold' }}>REAL-TIME ANALYTICS v3.0</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px' }}>
        
        {/* 2. CAPITAL EN LA CALLE */}
        <div style={{ ...cardStyle, borderLeft: '6px solid #39FF14' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>Capital en Circulación</span>
            <Activity color="#39FF14" size={20} />
          </div>
          <span style={{ ...valueStyle, color: '#39FF14', fontSize: '28px' }}>{f(metricas.pendientes)}</span>
          <div style={{ height: '6px', width: '100%', background: '#222', borderRadius: '10px', marginTop: '5px' }}>
            <div style={{ height: '100%', width: `${metricas.efectividadCobro}%`, background: 'linear-gradient(90deg, #39FF14, #00E5FF)', borderRadius: '10px' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555' }}>
            <span>RETORNO ACTUAL: {metricas.efectividadCobro.toFixed(1)}%</span>
            <span>EST. 24h: {f(metricas.proximoCobro)}</span>
          </div>
        </div>

        {/* 3. UTILIDAD NETA */}
        <div style={{ ...cardStyle, borderLeft: '6px solid #FFD700' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>Utilidad Neta (Solo Intereses)</span>
            <DollarSign color="#FFD700" size={20} />
          </div>
          <span style={{ ...valueStyle, color: '#FFD700' }}>{f(metricas.gananciaIntereses)}</span>
          <div style={{ fontSize: '10px', color: '#888' }}>Dinero generado por encima del capital</div>
        </div>

        {/* 4. CARTERA GESTIONADA */}
        <div style={{ ...cardStyle, borderLeft: '6px solid #00E5FF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>Cartera Gestionada (Inversión)</span>
            <TrendingUp color="#00E5FF" size={20} />
          </div>
          <span style={valueStyle}>{f(metricas.capitalBase)}</span>
          <div style={{ fontSize: '10px', color: '#444' }}>Total prestado sin intereses</div>
        </div>

        {/* 5. GRID DE CLIENTES Y RENTABILIDAD */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={cardStyle}>
            <ArrowUpCircle color="#39FF14" size={22} />
            <span style={{ ...labelStyle, fontSize: '10px' }}>Clientes Activos</span>
            <span style={{ ...valueStyle, fontSize: '22px' }}>{metricas.clientesActivos}</span>
          </div>
          <div style={cardStyle}>
            <PieIcon color="#FFD700" size={22} />
            <span style={{ ...labelStyle, fontSize: '10px' }}>Rentabilidad</span>
            <span style={{ ...valueStyle, fontSize: '22px' }}>+20.0%</span>
          </div>
        </div>

        {/* 6. ANALIZADOR DE SALUD FINANCIERA */}
        <div style={{ background: 'linear-gradient(145, #111, #000)', padding: '25px', borderRadius: '30px', border: '1px dashed #333', textAlign: 'center' }}>
            <ShieldCheck size={32} color="#39FF14" style={{ marginBottom: '10px' }} />
            <div style={{ fontWeight: '900', fontSize: '14px' }}>ESTADO DE LIBRANZA</div>
            <p style={{ color: '#666', fontSize: '11px', margin: '5px 0' }}>
                {metricas.totalRecaudado > metricas.capitalBase 
                    ? "🎉 CAPITAL LIBRADO. Operando con utilidad pura." 
                    : `Faltan ${f(metricas.capitalBase - metricas.totalRecaudado)} para recuperar inversión base.`}
            </p>
        </div>
      </div>

      {/* 7. BOTÓN DE CORTE DE CAJA */}
      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center' }}>
        <button onClick={generarCorteCaja} style={{ background: 'rgba(57,255,20,0.1)', border: '1px solid #39FF14', color: '#39FF14', padding: '15px 30px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase' }}>
            Realizar Corte de Caja <BarChart3 size={18} />
        </button>
      </div>

      {/* MODAL DE MOROSOS Y GESTIÓN DE WHATSAPP */}
      {showMorososModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0a0a0a', width: '100%', maxWidth: '400px', borderRadius: '35px', border: '1px solid #ff4444', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowMorososModal(false)} style={{ position: 'absolute', right: '25px', top: '25px', background: 'none', border: 'none', color: '#ff4444' }}>
              <X size={24} />
            </button>
            <h3 style={{ color: '#ff4444', fontWeight: '900', marginBottom: '20px' }}>COBRO INMEDIATO</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '50vh', overflowY: 'auto' }}>
              {morosos.map((m) => (
                <div key={m.id} style={{ background: '#111', padding: '15px', borderRadius: '20px', border: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '900', fontSize: '14px' }}>{m.nombreCliente}</div>
                    <div style={{ color: '#ff4444', fontSize: '13px', fontWeight: 'bold' }}>Debe: {f(m.totalDeuda)}</div>
                  </div>
                  <a href={generarLinkWhatsApp(m)} target="_blank" rel="noreferrer" style={{ background: '#25D366', padding: '12px', borderRadius: '15px', color: 'white' }}>
                    <MessageCircle size={20} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Caja;