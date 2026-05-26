import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Lock, Trash2, X, ArrowUpRight, ArrowDownLeft, CheckCircle } from 'lucide-react';

const FlujoCaja = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [formMovimiento, setFormMovimiento] = useState({ concepto: '', monto: '', tipo: 'ingreso', metodo: 'efectivo' });
  
  // Estados de Control e Interfaz
  const [movimientoEditando, setMovimientoEditando] = useState(null);
  const [isModalEditOpen, setIsModalEditOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Seguridad y Referencias
  const [passwordInput, setPasswordInput] = useState('');
  const [idSeleccionado, setIdSeleccionado] = useState('');
  const [authAction, setAuthAction] = useState(null); // 'guardar_edit' o 'borrar_definitivo'

  const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: '' });

  const CLAVE_SEGURIDAD = "1234"; // Tu PIN de seguridad

  // Escuchar movimientos en tiempo real
  useEffect(() => {
    const q = query(collection(db, "flujoCaja"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setMovimientos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const mostrarAlerta = (msg, tipo = 'success') => {
    setNotificacion({ show: true, mensaje: msg, tipo });
    setTimeout(() => setNotificacion({ show: false, mensaje: '', tipo: '' }), 3000);
  };

  const formatCurrency = (value) => {
    if (!value) return '$ 0';
    const numericValue = typeof value === 'string' ? value.replace(/\D/g, "") : Math.round(value).toString();
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(numericValue);
  };

  // Métricas
  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + (m.monto || 0), 0);
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + (m.monto || 0), 0);
  const balanceNeto = totalIngresos - totalEgresos;

  const efectivoTotal = movimientos.reduce((sum, m) => {
    if (m.metodo !== 'efectivo') return sum;
    return m.tipo === 'ingreso' ? sum + m.monto : sum - m.monto;
  }, 0);

  const nequiTotal = movimientos.reduce((sum, m) => {
    if (m.metodo !== 'nequi') return sum;
    return m.tipo === 'ingreso' ? sum + m.monto : sum - m.monto;
  }, 0);

  // Crear Registro Libre
  const registrarMovimiento = async (e) => {
    e.preventDefault();
    try {
      const numericMonto = parseFloat(formMovimiento.monto.replace(/\D/g, "")) || 0;
      if (numericMonto <= 0) return mostrarAlerta("⚠️ Ingresa un monto válido", "error");

      await addDoc(collection(db, "flujoCaja"), {
        concepto: formMovimiento.concepto,
        monto: numericMonto,
        tipo: formMovimiento.tipo,
        metodo: formMovimiento.metodo,
        fecha: serverTimestamp()
      });

      mostrarAlerta("✅ Movimiento registrado con éxito");
      setFormMovimiento({ concepto: '', monto: '', tipo: 'ingreso', metodo: 'efectivo' });
    } catch (error) { mostrarAlerta(error.message, "error"); }
  };

  // 1. PASO: Tocar el historial abre DIRECTAMENTE el panel de edición
  const abrirEditor = (movimiento) => {
    setIdSeleccionado(movimiento.id);
    setMovimientoEditando({
      concepto: movimiento.concepto,
      monto: movimiento.monto.toString(),
      tipo: movimiento.tipo,
      metodo: movimiento.metodo
    });
    setIsModalEditOpen(true);
  };

  // 2. PASO: Interceptores que congelan la acción y piden el PIN
  const pedirClaveParaActualizar = (e) => {
    e.preventDefault();
    setAuthAction('guardar_edit');
    setIsAuthModalOpen(true);
  };

  const pedirClaveParaEliminar = () => {
    setAuthAction('borrar_definitivo');
    setIsAuthModalOpen(true);
  };

  // 3. PASO: El validador final que ejecuta en Firebase
  const verificarClaveYEjecutar = async () => {
    if (passwordInput !== CLAVE_SEGURIDAD) {
      mostrarAlerta("❌ Contraseña Incorrecta", "error");
      return;
    }

    setIsAuthModalOpen(false);
    setPasswordInput('');

    if (authAction === 'guardar_edit') {
      try {
        const numericMonto = typeof movimientoEditando.monto === 'string' 
          ? parseFloat(movimientoEditando.monto.replace(/\D/g, "")) || 0 
          : movimientoEditando.monto;

        await updateDoc(doc(db, "flujoCaja", idSeleccionado), {
          concepto: movimientoEditando.concepto,
          monto: numericMonto,
          tipo: movimientoEditando.tipo,
          metodo: movimientoEditando.metodo
        });

        setIsModalEditOpen(false);
        mostrarAlerta("💾 Registro modificado en la base de datos");
      } catch (error) { mostrarAlerta(error.message, "error"); }

    } else if (authAction === 'borrar_definitivo') {
      try {
        await deleteDoc(doc(db, "flujoCaja", idSeleccionado));
        setIsModalEditOpen(false);
        mostrarAlerta("🗑️ Registro eliminado permanentemente");
      } catch (error) { mostrarAlerta(error.message, "error"); }
    }
  };

  return (
    <div className="p-6 bg-[#0a0a0a] min-h-screen text-white font-sans pb-28">
      
      {/* Alertas */}
      {notificacion.show && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-bold z-[6000] flex items-center gap-2 shadow-2xl ${notificacion.tipo === 'error' ? 'bg-red-500 text-white' : 'bg-[#39FF14] text-black'}`}>
          <CheckCircle size={18}/> {notificacion.mensaje}
        </div>
      )}

      <h2 className="text-[#39FF14] text-2xl font-black uppercase tracking-wider text-center mb-6">Flujo de Caja</h2>

      {/* METRICAS */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#111] p-4 rounded-2xl border-l-4 border-[#39FF14]">
          <span className="text-[10px] text-gray-500 font-bold tracking-wider flex items-center gap-1 uppercase"><ArrowUpRight size={12} className="text-[#39FF14]"/> Ingresos</span>
          <div className="text-lg font-black text-[#39FF14] mt-1">{formatCurrency(totalIngresos)}</div>
        </div>
        <div className="bg-[#111] p-4 rounded-2xl border-l-4 border-red-500">
          <span className="text-[10px] text-gray-500 font-bold tracking-wider flex items-center gap-1 uppercase"><ArrowDownLeft size={12} className="text-red-500"/> Egresos</span>
          <div className="text-lg font-black text-red-500 mt-1">{formatCurrency(totalEgresos)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-[#161616] p-3 rounded-xl text-center border border-gray-900">
          <div className="text-[9px] text-gray-400 font-bold uppercase">Caja Efectivo</div>
          <div className="text-sm font-bold text-white mt-1">{formatCurrency(efectivoTotal)}</div>
        </div>
        <div className="bg-[#161616] p-3 rounded-xl text-center border border-gray-900">
          <div className="text-[9px] text-gray-400 font-bold uppercase">Caja Nequi</div>
          <div className="text-sm font-bold text-cyan-400 mt-1">{formatCurrency(nequiTotal)}</div>
        </div>
        <div className="bg-[#000] p-3 rounded-xl text-center border border-[#39FF1433] shadow-[inset_0_0_10px_#39FF1411]">
          <div className="text-[9px] text-[#39FF14] font-bold uppercase">Saldo Neto</div>
          <div className="text-sm font-black text-[#39FF14] mt-1">{formatCurrency(balanceNeto)}</div>
        </div>
      </div>

      {/* FORMULARIO DE CREACIÓN */}
      <details className="mb-6 group">
        <summary className="bg-[#39FF14] text-black py-3 px-4 rounded-2xl font-black text-center list-none cursor-pointer uppercase tracking-wide select-none">
          + Registrar Movimiento de Caja
        </summary>
        <form onSubmit={registrarMovimiento} className="bg-[#111] p-4 mt-2 rounded-2xl border border-gray-900 flex flex-col gap-3">
          <div>
            <label className="text-[11px] text-[#39FF14] font-bold block mb-1 uppercase">Concepto / Detalle</label>
            <input type="text" placeholder="Ej. Cobro cuota..." value={formMovimiento.concepto} onChange={e => setFormMovimiento({...formMovimiento, concepto: e.target.value})} className="w-full p-3 rounded-xl bg-black border border-gray-800 text-white text-sm focus:border-[#39FF14] outline-none" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#39FF14] font-bold block mb-1 uppercase">Monto ($)</label>
              <input type="text" placeholder="$ 0" value={formMovimiento.monto} onChange={e => setFormMovimiento({...formMovimiento, monto: formatCurrency(e.target.value)})} className="w-full p-3 rounded-xl bg-black border border-gray-800 text-[#39FF14] font-bold text-sm focus:border-[#39FF14] outline-none" required />
            </div>
            <div>
              <label className="text-[11px] text-[#39FF14] font-bold block mb-1 uppercase">Método</label>
              <select value={formMovimiento.metodo} onChange={e => setFormMovimiento({...formMovimiento, metodo: e.target.value})} className="w-full p-3 rounded-xl bg-black border border-gray-800 text-white text-sm focus:border-[#39FF14] outline-none">
                <option value="efectivo">EFECTIVO</option>
                <option value="nequi">NEQUI</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[#39FF14] font-bold block mb-1 uppercase">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setFormMovimiento({...formMovimiento, tipo: 'ingreso'})} className={`py-2 rounded-xl text-xs font-bold border ${formMovimiento.tipo === 'ingreso' ? 'bg-[#39FF14] text-black border-[#39FF14]' : 'bg-black text-gray-400 border-gray-800'}`}>INGRESO</button>
              <button type="button" onClick={() => setFormMovimiento({...formMovimiento, tipo: 'egreso'})} className={`py-2 rounded-xl text-xs font-bold border ${formMovimiento.tipo === 'egreso' ? 'bg-red-500 text-white border-red-500' : 'bg-black text-gray-400 border-gray-800'}`}>EGRESO</button>
            </div>
          </div>

          <button type="submit" className="w-full bg-[#39FF14] text-black p-3 rounded-xl font-bold text-sm uppercase tracking-wider mt-2">Guardar Registro</button>
        </form>
      </details>

      {/* HISTORIAL */}
      <h3 className="text-gray-500 text-xs font-bold uppercase mb-3 tracking-widest">Historial Reciente</h3>
      <div className="flex flex-col gap-2">
        {movimientos.length === 0 ? (
          <div className="bg-[#111] p-6 text-center rounded-2xl text-gray-600 text-sm">No hay registros de caja hoy.</div>
        ) : (
          movimientos.map((m) => (
            <div key={m.id} onClick={() => abrirEditor(m)} className="bg-[#141414] p-4 rounded-xl flex justify-between items-center border border-gray-900 cursor-pointer hover:border-gray-800 transition-all">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${m.tipo === 'ingreso' ? 'bg-[#39FF1411]' : 'bg-red-500/10'}`}>
                  {m.tipo === 'ingreso' ? <ArrowUpRight size={18} className="text-[#39FF14]"/> : <ArrowDownLeft size={18} className="text-red-500"/>}
                </div>
                <div>
                  <div className="text-sm font-bold text-white capitalize">{m.concepto}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${m.metodo === 'nequi' ? 'bg-cyan-950 text-cyan-400' : 'bg-zinc-800 text-zinc-300'}`}>{m.metodo}</span>
                    <span className="text-[10px] text-gray-600">Toca para modificar</span>
                  </div>
                </div>
              </div>
              <div className={`text-sm font-black ${m.tipo === 'ingreso' ? 'text-[#39FF14]' : 'text-red-500'}`}>
                {m.tipo === 'ingreso' ? '+' : '-'} {formatCurrency(m.monto)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* PANTALLA 1: MODAL DE EDICIÓN DIRECTO */}
      {isModalEditOpen && movimientoEditando && (
        <div className="fixed inset-0 bg-black/90 z-[5400] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111] w-full max-w-[400px] p-5 rounded-2xl border border-gray-800 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[#39FF14] font-black uppercase text-sm tracking-wider">Modificar Registro</h3>
              <X onClick={() => setIsModalEditOpen(false)} className="text-gray-500 cursor-pointer hover:text-white" />
            </div>
            
            <form onSubmit={pedirClaveParaActualizar} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] text-[#39FF14] font-bold block mb-1 uppercase">Concepto / Detalle</label>
                <input type="text" value={movimientoEditando.concepto} onChange={e => setMovimientoEditando({...movimientoEditando, concepto: e.target.value})} className="w-full p-3 rounded-xl bg-black border border-gray-800 text-sm outline-none text-white focus:border-[#39FF14]" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#39FF14] font-bold block mb-1 uppercase">Monto ($)</label>
                  <input type="text" value={formatCurrency(movimientoEditando.monto)} onChange={e => setMovimientoEditando({...movimientoEditando, monto: e.target.value})} className="w-full p-3 rounded-xl bg-black border border-gray-800 font-bold text-sm outline-none text-[#39FF14]" required />
                </div>
                <div>
                  <label className="text-[11px] text-[#39FF14] font-bold block mb-1 uppercase">Método</label>
                  <select value={movimientoEditando.metodo} onChange={e => setMovimientoEditando({...movimientoEditando, metodo: e.target.value})} className="w-full p-3 rounded-xl bg-black border border-gray-800 text-sm text-white outline-none">
                    <option value="efectivo">EFECTIVO</option>
                    <option value="nequi">NEQUI</option>
                  </select>
                </div>
              </div>

              <div className="mb-2">
                <label className="text-[11px] text-[#39FF14] font-bold block mb-1 uppercase">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setMovimientoEditando({...movimientoEditando, tipo: 'ingreso'})} className={`py-2 rounded-xl text-xs font-bold border ${movimientoEditando.tipo === 'ingreso' ? 'bg-[#39FF14] text-black border-[#39FF14]' : 'bg-black text-gray-500 border-gray-800'}`}>INGRESO</button>
                  <button type="button" onClick={() => setMovimientoEditando({...movimientoEditando, tipo: 'egreso'})} className={`py-2 rounded-xl text-xs font-bold border ${movimientoEditando.tipo === 'egreso' ? 'bg-red-500 text-white border-red-500' : 'bg-black text-gray-500 border-gray-800'}`}>EGRESO</button>
                </div>
              </div>

              {/* BOTONES DE ACCIÓN VISIBLES */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                <button type="button" onClick={pedirClaveParaEliminar} className="bg-red-500/10 text-red-500 border border-red-500/20 p-3 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                  <Trash2 size={18}/>
                </button>
                <button type="submit" className="col-span-3 bg-[#39FF14] text-black p-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-[0_0_15px_#39FF1433]">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PANTALLA 2: CAPA SUPERIOR DE COINCIDENCIA DE PIN */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[5500] flex items-center justify-center p-4">
          <div className="bg-[#111] w-full max-w-[340px] p-6 rounded-3xl border-2 border-[#39FF14] text-center shadow-[0_0_30px_#39FF1422]">
            <Lock className="text-[#39FF14] mx-auto mb-2" size={28} />
            <h3 className="text-[#39FF14] font-black text-md mb-1 uppercase tracking-wide">Confirmar Operación</h3>
            <p className="text-gray-500 text-[11px] mb-4">
              {authAction === 'borrar_definitivo' ? '⚠️ Vas a ELIMINAR este registro.' : '📝 Vas a ACTUALIZAR este registro.'} Ingresa el PIN.
            </p>
            <input type="password" placeholder="••••" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full p-3 rounded-xl bg-black border border-gray-800 text-[#39FF14] text-center font-black text-2xl tracking-widest focus:border-[#39FF14] outline-none mb-4" autoFocus />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setIsAuthModalOpen(false); setPasswordInput(''); }} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs font-bold uppercase text-white">Cancelar</button>
              <button type="button" onClick={verificarClaveYEjecutar} className="bg-[#39FF14] text-black p-3 rounded-xl text-xs font-black uppercase">Autorizar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FlujoCaja;