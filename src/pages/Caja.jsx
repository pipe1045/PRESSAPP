import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { 
  Wallet, ArrowUpCircle, TrendingUp, PieChart as PieIcon, 
  DollarSign, Activity, Zap, ShieldCheck, BarChart3, 
  AlertCircle, X, MessageCircle, ExternalLink, Clock,
  PlusCircle, ArrowDownCircle, Percent, Calendar
} from 'lucide-react';

const Caja = () => {
  // Estados Base
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

  // NUEVOS ESTADOS: Gastos, Ingresos Estructurados y Tiempos
  const [gastos, setGastos] = useState([]);
  const [nuevoGasto, setNuevoGasto] = useState({ monto: '', descripcion: '', categoria: 'Operativo' });
  const [tabPeriodo, setTabPeriodo] = useState('diario'); // diario, semanal, quincenal, mensual, anual
  
  const [totalesPeriodos, setTotalesPeriodos] = useState({
    ingresos: { diario: 0, semanal: 0, quincenal: 0, mensual: 0, anual: 0 },
    gastos: { diario: 0, semanal: 0, quincenal: 0, mensual: 0, anual: 0 }
  });

  useEffect(() => {
    // 1. Escuchar Préstamos e Ingresos de Cobros
    const qPrestamos = query(collection(db, "prestamos"));
    const unsubscribePrestamos = onSnapshot(qPrestamos, (snapshot) => {
      let totalContratos = 0;      
      let capitalPuroInvertido = 0; 
      let deudaActualCalle = 0;    
      let recaudadoHistorico = 0;  
      let listaMorosos = [];

      // Inicializadores para acumulación por rangos de fecha
      let incDiario = 0, incSemanal = 0, incQuincenal = 0, incMensual = 0, incAnual = 0;
      
      const ahora = new Date();
      const unDia = 24 * 60 * 60 * 1000;

      snapshot.forEach(doc => {
        const data = doc.data();
        const montoTotalConInteres = parseFloat(data.montoTotal || 0);
        const capitalInicial = parseFloat(data.monto || 0);
        const deudaPendiente = parseFloat(data.totalDeuda || 0);

        totalContratos += montoTotalConInteres;
        capitalPuroInvertido += capitalInicial;
        
        if (data.estado !== 'finalizado') {
          deudaActualCalle += deudaPendiente;
          if (data.enMora || (data.diasRetraso > 1 && deudaPendiente > 0)) {
            listaMorosos.push({ id: doc.id, ...data });
          }
        }
        recaudadoHistorico += (montoTotalConInteres - deudaPendiente);

        // Procesar Historial de pagos para la distribución de ingresos en tiempo real
        const historial = data.historialPagos || [];
        historial.forEach(pago => {
          if (pago.estado === 'pagado' || pago.state === 'pagado') {
            const valorPago = parseFloat(pago.montoPagado || data.cuotaDiaria || 0);
            const fechaPago = pago.fecha ? new Date(pago.fecha) : ahora;
            const diferenciaDias = Math.floor((ahora - fechaPago) / unDia);

            if (diferenciaDias <= 0) incDiario += valorPago;
            if (diferenciaDias <= 7) incSemanal += valorPago;
            if (diferenciaDias <= 15) incQuincenal += valorPago;
            if (diferenciaDias <= 30) incMensual += valorPago;
            if (diferenciaDias <= 365) incAnual += valorPago;
          }
        });
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
        proximoCobro: deudaActualCalle * 0.1
      }));

      setTotalesPeriodos(prev => ({
        ...prev,
        ingresos: { diario: incDiario, semanal: incSemanal, quincenal: incQuincenal, mensual: incMensual, anual: incAnual }
      }));
    });

    // 2. Escuchar Gastos en Tiempo Real
    const qGastos = query(collection(db, "gastos"), orderBy("fechaCreacion", "desc"));
    const unsubscribeGastos = onSnapshot(qGastos, (snapshot) => {
      let listaGastos = [];
      let gastDiario = 0, gastSemanal = 0, gastQuincenal = 0, gastMensual = 0, gastAnual = 0;
      
      const ahora = new Date();
      const unDia = 24 * 60 * 60 * 1000;

      snapshot.forEach(doc => {
        const data = doc.data();
        const monto = parseFloat(data.monto || 0);
        // Manejo seguro del timestamp de Firebase
        const fechaGasto = data.fechaCreacion ? data.fechaCreacion.toDate() : ahora;
        const diferenciaDias = Math.floor((ahora - fechaGasto) / unDia);

        listaGastos.push({ id: doc.id, ...data, fechaFormateada: fechaGasto.toLocaleDateString() });

        if (diferenciaDias <= 0) gastDiario += monto;
        if (diferenciaDias <= 7) gastSemanal += monto;
        if (diferenciaDias <= 15) gastQuincenal += monto;
        if (diferenciaDias <= 30) gastMensual += monto;
        if (diferenciaDias <= 365) gastAnual += monto;
      });

      setGastos(listaGastos);
      setTotalesPeriodos(prev => ({
        ...prev,
        gastos: { diario: gastDiario, semanal: gastSemanal, quincenal: gastQuincenal, mensual: gastMensual, anual: gastAnual }
      }));
    });

    // 3. Escuchar Clientes Activos
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
      unsubscribeGastos();
      unsubscribeClientes();
    };
  }, []);

  // Registrar Gasto en Base de Datos
  const handleGuardarGasto = async (e) => {
    e.preventDefault();
    if (!nuevoGasto.monto || !nuevoGasto.descripcion) return;

    try {
      await addDoc(collection(db, "gastos"), {
        monto: parseFloat(nuevoGasto.monto),
        descripcion: nuevoGasto.descripcion,
        categoria: nuevoGasto.categoria,
        fechaCreacion: new Date() // Sincronizado para filtros locales de inmediato
      });
      setNuevoGasto({ monto: '', descripcion: '', categoria: 'Operativo' });
    } catch (error) {
      console.error("Error guardando gasto: ", error);
    }
  };

  const f = (num) => `$ ${Math.round(num || 0).toLocaleString('es-CO')}`;

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
    const reporte = `📊 *CORTE DE CAJA TOTAL - ${fecha}*\n--------------------------------\n💰 *Capital en Calle:* ${f(metricas.pendientes)}\n✅ *Total Recaudado:* ${f(metricas.totalRecaudado)}\n📉 *Gastos de Hoy:* ${f(totalesPeriodos.gastos.diario)}\n--------------------------------\n💡 _Generado por Sistema Core Finance v5.0_`;

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
    border: '1px solid rgba(57,255,20,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
  };

  const labelStyle = { color: '#666', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' };
  const valueStyle = { color: '#fff', fontSize: '24px', fontWeight: '900' };

  // Cálculo de estadísticas avanzadas dinámicas
  const ingresoActualPeriodo = totalesPeriodos.ingresos[tabPeriodo];
  const gastoActualPeriodo = totalesPeriodos.gastos[tabPeriodo];
  const balanceNetoReal = ingresoActualPeriodo - gastoActualPeriodo;

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '20px', paddingBottom: '120px', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* ALERTA DE MORA TÁCTICA */}
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
          <h2 style={{ color: '#39FF14', fontWeight: '900', margin: 0, letterSpacing: '3px', fontSize: '20px' }}>CONTROL CENTRAL DE CAJA</h2>
        </div>
        <span style={{ color: '#444', fontSize: '10px', fontWeight: 'bold' }}>BALANCES, INGRESOS Y GASTOS MULTI-TEMPORALES</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px' }}>
        
        {/* --- NUEVA SECCIÓN: FORMULARIO REGISTRO DE GASTOS --- */}
        <div style={{ ...cardStyle, border: '1px dashed rgba(255,68,68,0.3)', background: '#141414' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={18} color="#ff4444" />
            <span style={{ color: '#ff4444', fontSize: '12px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>Registrar Egreso / Gasto Operativo</span>
          </div>
          <form onSubmit={handleGuardarGasto} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input 
                type="number" 
                placeholder="Monto ($)" 
                value={nuevoGasto.monto}
                onChange={(e) => setNuevoGasto({...nuevoGasto, monto: e.target.value})}
                style={{ background: '#0a0a0a', border: '1px solid #333', padding: '12px', borderRadius: '14px', color: 'white', fontWeight: 'bold', fontSize: '14px', outline: 'none' }}
                required
              />
              <select 
                value={nuevoGasto.categoria}
                onChange={(e) => setNuevoGasto({...nuevoGasto, categoria: e.target.value})}
                style={{ background: '#0a0a0a', border: '1px solid #333', padding: '12px', borderRadius: '14px', color: 'white', fontWeight: 'bold', fontSize: '14px', outline: 'none' }}
              >
                <option value="Operativo">Operativo</option>
                <option value="Gasolina">Gasolina / Ruta</option>
                <option value="Papelería">Papelería / Impresión</option>
                <option value="Comisión">Comisiones</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            <input 
              type="text" 
              placeholder="Descripción del gasto..." 
              value={nuevoGasto.descripcion}
              onChange={(e) => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})}
              style={{ background: '#0a0a0a', border: '1px solid #333', padding: '12px', borderRadius: '14px', color: 'white', fontSize: '13px', outline: 'none' }}
              required
            />
            <button type="submit" style={{ background: '#ff4444', color: 'white', border: 'none', padding: '12px', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px' }}>
              Inyectar Gasto a Caja
            </button>
          </form>
        </div>

        {/* --- NUEVA SECCIÓN: SELECTOR DE RANGOS DE TIEMPO (TABS) --- */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '5px', background: '#111', padding: '5px', borderRadius: '16px' }}>
          {['diario', 'semanal', 'quincenal', 'mensual', 'anual'].map((periodo) => (
            <button
              key={periodo}
              onClick={() => setTabPeriodo(periodo)}
              style={{
                background: tabPeriodo === periodo ? '#39FF14' : 'transparent',
                color: tabPeriodo === periodo ? '#000' : '#666',
                border: 'none',
                padding: '10px 2px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: '900',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              {periodo}
            </button>
          ))}
        </div>

        {/* METRICAS DEL RANGO SELECCIONADO */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={{ ...cardStyle, borderLeft: '4px solid #39FF14' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={labelStyle}>Ingresos ({tabPeriodo})</span>
              <ArrowUpCircle color="#39FF14" size={16} />
            </div>
            <span style={{ ...valueStyle, fontSize: '20px', color: '#39FF14' }}>{f(ingresoActualPeriodo)}</span>
          </div>

          <div style={{ ...cardStyle, borderLeft: '4px solid #ff4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={labelStyle}>Gastos ({tabPeriodo})</span>
              <ArrowDownCircle color="#ff4444" size={16} />
            </div>
            <span style={{ ...valueStyle, fontSize: '20px', color: '#ff4444' }}>{f(gastoActualPeriodo)}</span>
          </div>
        </div>

        {/* --- NUEVA SECCIÓN: ESTADÍSTICAS Y DETALLES DE CAJA NETA --- */}
        <div style={{ ...cardStyle, background: 'linear-gradient(145deg, #161616, #0a0a0a)', border: '1px solid #333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>Rendimiento Neto de Caja Computado</span>
            <PieIcon color="#00E5FF" size={18} />
          </div>
          <span style={{ ...valueStyle, color: balanceNetoReal >= 0 ? '#39FF14' : '#ff4444', fontSize: '28px' }}>
            {f(balanceNetoReal)}
          </span>
          <div style={{ height: '2px', backgroundColor: '#222', width: '100%', margin: '4px 0' }} />
          
          {/* Detalles e indicadores de salud agregados */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '5px' }}>
            <div>
              <span style={{ color: '#444', fontSize: '9px', fontWeight: 'bold', display: 'block' }}>EFICIENCIA OPERATIVA</span>
              <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
                {ingresoActualPeriodo > 0 ? ((balanceNetoReal / ingresoActualPeriodo) * 100).toFixed(1) : 0}% Neto
              </span>
            </div>
            <div>
              <span style={{ color: '#444', fontSize: '9px', fontWeight: 'bold', display: 'block' }}>RETENCIÓN DE CAPITAL</span>
              <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
                {gastoActualPeriodo > 0 && ingresoActualPeriodo > 0 ? ((gastoActualPeriodo / ingresoActualPeriodo) * 100).toFixed(1) : 0}% Gastado
              </span>
            </div>
          </div>
        </div>

        {/* HISTÓRICO DE CAPITAL EN CALLE GLOBAL */}
        <div style={{ ...cardStyle, borderLeft: '6px solid #39FF14' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={labelStyle}>Capital en Circulación (Calle)</span>
            <Activity color="#39FF14" size={20} />
          </div>
          <span style={{ ...valueStyle, color: '#39FF14', fontSize: '28px' }}>{f(metricas.pendientes)}</span>
          <div style={{ height: '6px', width: '100%', background: '#222', borderRadius: '10px' }}>
            <div style={{ height: '100%', width: `${metricas.efectividadCobro}%`, background: 'linear-gradient(90deg, #39FF14, #00E5FF)', borderRadius: '10px' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555' }}>
            <span>RETORNO DE CARTERA: {metricas.efectividadCobro.toFixed(1)}%</span>
            <span>EFECTIVO HISTÓRICO: {f(metricas.totalRecaudado)}</span>
          </div>
        </div>

        {/* LISTADO DE ÚLTIMOS GASTOS REGISTRADOS */}
        <div style={{ ...cardStyle }}>
          <span style={labelStyle}>Bitácora de Egresos Recientes</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '2px' }}>
            {gastos.length === 0 ? (
              <span style={{ color: '#444', fontSize: '11px', textAlign: 'center', padding: '10px' }}>No hay egresos en el historial.</span>
            ) : (
              gastos.slice(0, 5).map(g => (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a', padding: '10px 14px', borderRadius: '14px', border: '1px solid #1a1a1a' }}>
                  <div>
                    <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', display: 'block' }}>{g.descripcion}</span>
                    <span style={{ color: '#444', fontSize: '10px' }}>{g.fechaFormateada} • <b style={{ color: '#666' }}>{g.categoria}</b></span>
                  </div>
                  <span style={{ color: '#ff4444', fontSize: '13px', fontWeight: '900' }}>-{f(g.monto)}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* BOTÓN DE CORTE DE CAJA */}
      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center' }}>
        <button onClick={generarCorteCaja} style={{ background: 'rgba(57,255,20,0.1)', border: '1px solid #39FF14', color: '#39FF14', padding: '15px 30px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', cursor: 'pointer' }}>
            Realizar Corte de Caja <BarChart3 size={18} />
        </button>
      </div>

      {/* MODAL DE MOROSOS */}
      {showMorososModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0a0a0a', width: '100%', maxWidth: '400px', borderRadius: '35px', border: '1px solid #ff4444', padding: '30px', position: 'relative' }}>
            <button onClick={() => setShowMorososModal(false)} style={{ position: 'absolute', right: '25px', top: '25px', background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}>
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