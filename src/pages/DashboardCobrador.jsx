import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { UserPlus, Search, Phone, MapPin, Star, Edit2, Trash2, X, MessageCircle, User, CreditCard, Filter, ChevronDown, ChevronUp, CheckCircle, Lock, Percent, Calendar, ArrowUpRight, CheckCircle2, History } from 'lucide-react';

const DashboardCobrador = () => {
  const [formData, setFormData] = useState({ nombre: '', cedula: '', telefono: '', direccion: '' });
  const [clientes, setClientes] = useState([]);
  const [prestamos, setPrestamos] = useState([]); 
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstrellas, setFiltroEstrellas] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);
  
  const [clienteEditando, setClienteEditando] = useState(null);
  const [clientePrestamo, setClientePrestamo] = useState(null);
  const [clienteHistorial, setClienteHistorial] = useState(null);
  
  const [isModalEditOpen, setIsModalEditOpen] = useState(false);
  const [isModalLoanOpen, setIsModalLoanOpen] = useState(false);
  const [isModalHistoryOpen, setIsModalHistoryOpen] = useState(false);
  const [isModalEditLoanOpen, setIsModalEditLoanOpen] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [tempData, setTempData] = useState(null); 
  const [authAction, setAuthAction] = useState(null); // 'cliente', 'edit_prestamo' o 'delete_prestamo'

  const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: '' });
  const [prestamoData, setPrestamoData] = useState({ monto: '', cuotas: '30', interes: '20' });
  const [editPrestamoData, setEditPrestamoData] = useState(null); 

  const CLAVE_SEGURIDAD = "1234";

  useEffect(() => {
    const qClientes = query(collection(db, "clientes"), orderBy("fechaRegistro", "desc"));
    const unsubClientes = onSnapshot(qClientes, (snapshot) => {
      setClientes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qPrestamos = query(collection(db, "prestamos"), orderBy("fecha", "desc"));
    const unsubPrestamos = onSnapshot(qPrestamos, (snapshot) => {
      setPrestamos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubClientes(); unsubPrestamos(); };
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

  const getPrestamosPorCliente = (clienteId) => prestamos.filter(p => p.clienteId === clienteId);

  const calcularCuotaTotalDiaria = (clienteId) => {
    return getPrestamosPorCliente(clienteId)
      .filter(p => p.cuotasRestantes > 0)
      .reduce((sum, p) => sum + (p.cuotaDiaria || 0), 0);
  };

  const registrarCliente = async (e) => {
    e.preventDefault();
    try {
      const q = query(collection(db, "clientes"), where("cedula", "==", formData.cedula));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        mostrarAlerta("⚠️ La cédula ya está registrada", "error");
        return;
      }
      await addDoc(collection(db, "clientes"), {
        ...formData,
        fechaRegistro: serverTimestamp(),
        estado: 'activo',
        calificacion: 5,
        totalDeuda: 0
      });
      mostrarAlerta("✅ Cliente registrado con éxito");
      setFormData({ nombre: '', cedula: '', telefono: '', direccion: '' });
    } catch (error) { mostrarAlerta(error.message, "error"); }
  };

  const abrirAuth = (data, tipo) => {
    setTempData(data);
    setAuthAction(tipo);
    setIsAuthModalOpen(true);
  };

  const verificarAcceso = async () => {
    if (passwordInput === CLAVE_SEGURIDAD) {
      if (authAction === 'cliente') {
        setClienteEditando(tempData);
        setIsModalEditOpen(true);
      } else if (authAction === 'edit_prestamo') {
        const interesActual = 20; 
        const montoBase = tempData.montoTotal / (1 + (interesActual / 100));
        setEditPrestamoData({
            ...tempData,
            montoBase: formatCurrency(montoBase.toString()),
            interes: interesActual.toString()
        });
        setIsModalEditLoanOpen(true);
      } else if (authAction === 'delete_prestamo') {
          try {
              await deleteDoc(doc(db, "prestamos", tempData.id));
              mostrarAlerta("🗑️ Préstamo borrado del sistema");
          } catch (error) { mostrarAlerta(error.message, "error"); }
      }
      setIsAuthModalOpen(false);
      setPasswordInput('');
    } else { mostrarAlerta("❌ Contraseña Incorrecta", "error"); }
  };

  const eliminarConClave = async (id) => {
    const pass = prompt("Clave de seguridad para eliminar cliente:");
    if (pass === CLAVE_SEGURIDAD) {
      try {
        await deleteDoc(doc(db, "clientes", id));
        setIsModalEditOpen(false);
        mostrarAlerta("🗑️ Expediente eliminado correctamente");
      } catch (error) { mostrarAlerta(error.message, "error"); }
    } else { mostrarAlerta("❌ Clave incorrecta", "error"); }
  };

  // REESTRUCTURADO: Guarda cambios del préstamo sin inyectar ID en los datos internos
  const guardarCambiosPrestamo = async (e) => {
    e.preventDefault();
    try {
        const prestamoRef = doc(db, "prestamos", editPrestamoData.id);
        const baseNum = parseFloat(editPrestamoData.montoBase.replace(/\D/g, "")) || 0;
        const interesNum = parseFloat(editPrestamoData.interes) || 0;
        const diasNum = parseInt(editPrestamoData.cuotasRestantes) || 1;
        const nuevoMontoTotal = baseNum * (1 + (interesNum / 100));
        
        await updateDoc(prestamoRef, {
            cuotasRestantes: diasNum,
            montoTotal: nuevoMontoTotal,
            cuotaDiaria: nuevoMontoTotal / diasNum
        });
        
        setIsModalEditLoanOpen(false);
        setIsModalHistoryOpen(false); // Cierra historial para refrescar la vista limpia
        mostrarAlerta("💾 Préstamo actualizado");
    } catch (error) { mostrarAlerta(error.message, "error"); }
  };

  // CORRECCIÓN CRÍTICA: Extrae el ID para mapear la referencia y limpia los campos antes de enviarlos a Firestore
  const guardarCambios = async (e) => {
    e.preventDefault();
    try {
      const { id, ...datosLimpios } = clienteEditando; // Separa de manera limpia el ID de los datos
      const clienteRef = doc(db, "clientes", id);
      
      await updateDoc(clienteRef, datosLimpios);
      
      setIsModalEditOpen(false);
      mostrarAlerta("💾 Cambios guardados correctamente");
    } catch (error) { mostrarAlerta(error.message, "error"); }
  };

  const crearPrestamo = async (e) => {
    e.preventDefault();
    try {
      const numericMonto = parseFloat(prestamoData.monto.replace(/\D/g, ""));
      const numCuotas = parseInt(prestamoData.cuotas);
      const interesPorcentaje = parseFloat(prestamoData.interes);
      const montoTotal = numericMonto * (1 + (interesPorcentaje / 100));
      const valorCuota = montoTotal / numCuotas;

      await addDoc(collection(db, "prestamos"), {
        clienteId: clientePrestamo.id,
        nombreCliente: clientePrestamo.nombre,
        telefonoCliente: clientePrestamo.telefono, 
        cedulaCliente: clientePrestamo.cedula,     
        montoPrestamo: numericMonto,               
        montoTotal,
        cuotaDiaria: valorCuota,
        cuotasRestantes: numCuotas,
        fecha: serverTimestamp(),
        estado: 'en curso',
        historialPagos: []                         
      });
      
      await updateDoc(doc(db, "clientes", clientePrestamo.id), { 
        totalDeuda: (clientePrestamo.totalDeuda || 0) + montoTotal
      });
      
      mostrarAlerta("💵 Préstamo aprobado con éxito");
      setIsModalLoanOpen(false);
      setPrestamoData({ monto: '', cuotas: '30', interes: '20' });
    } catch (error) { mostrarAlerta(error.message, "error"); }
  };

  const realizarLlamadaMinutos = (telefono) => {
    if (!telefono) {
      mostrarAlerta("⚠️ Sin número de contacto", "error");
      return;
    }
    const telLimpio = String(telefono).replace(/\D/g, '');
    window.location.href = `tel:${telLimpio}`;
  };

  const clientesFiltrados = clientes.filter(c => {
    const matchesSearch = (c.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) || (c.cedula || '').includes(busqueda);
    const matchesStars = filtroEstrellas === 0 || c.calificacion === filtroEstrellas;
    const matchesStatus = filtroEstado === 'todos' || c.estado === filtroEstado;
    return matchesSearch && matchesStars && matchesStatus;
  });

  const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#000', color: 'white', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' };
  const labelStyle = { fontSize: '11px', color: '#39FF14', fontWeight: 'bold', marginBottom: '5px', display: 'block', textTransform: 'uppercase' };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', padding: '20px', paddingBottom: '100px', color: 'white', fontFamily: 'sans-serif' }}>
      
      {notificacion.show && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: notificacion.tipo === 'error' ? '#ff4444' : '#39FF14', color: 'black', padding: '12px 25px', borderRadius: '50px', fontWeight: 'bold', zIndex: 6000, display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <CheckCircle size={18}/> {notificacion.mensaje}
        </div>
      )}

      <h2 style={{ color: '#39FF14', fontWeight: '900', textAlign: 'center', letterSpacing: '2px' }}>PRESAPP PRO</h2>

      {/* FILTROS */}
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setShowFilters(!showFilters)} style={{ width: '100%', backgroundColor: '#111', color: '#39FF14', border: '1px solid #39FF1433', padding: '12px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Filter size={18}/> FILTRAR CLIENTES</div>
          {showFilters ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </button>
        {showFilters && (
          <div style={{ background: '#111', padding: '15px', borderRadius: '0 0 15px 15px', border: '1px solid #39FF1433', borderTop: 'none' }}>
            <label style={labelStyle}>Búsqueda</label>
            <input placeholder="Nombre o Cédula..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={inputStyle} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Estado</label>
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={inputStyle}>
                  <option value="todos">Todos</option>
                  <option value="activo">Activos</option>
                  <option value="inactivo">Inactivos</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Estrellas</label>
                <select value={filtroEstrellas} onChange={e => setFiltroEstrellas(parseInt(e.target.value))} style={inputStyle}>
                  <option value="0">Todas</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FORMULARIO REGISTRO */}
      <details style={{ marginBottom: '25px' }}>
        <summary style={{ backgroundColor: '#39FF14', color: 'black', padding: '14px', borderRadius: '15px', fontWeight: '900', textAlign: 'center', listStyle: 'none', cursor: 'pointer' }}>+ REGISTRAR NUEVO CLIENTE</summary>
        <form onSubmit={registrarCliente} style={{ background: '#111', padding: '15px', marginTop: '10px', borderRadius: '15px', border: '1px solid #222' }}>
          <input placeholder="Nombre Completo" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} style={inputStyle} required />
          <input placeholder="Cédula (Única)" value={formData.cedula} onChange={e => setFormData({...formData, cedula: e.target.value})} style={inputStyle} required />
          <input placeholder="Teléfono" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} style={inputStyle} required />
          <input placeholder="Dirección" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} style={inputStyle} required />
          <button type="submit" style={{ width: '100%', backgroundColor: '#39FF14', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold' }}>GUARDAR EN SISTEMA</button>
        </form>
      </details>

      {/* LISTA DE CLIENTES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {clientesFiltrados.map((c) => {
          const cuotaTotal = calcularCuotaTotalDiaria(c.id);
          const prestamosActivos = getPrestamosPorCliente(c.id).filter(p => p.cuotasRestantes > 0).length;

          return (
            <div key={c.id} onClick={() => { setClienteHistorial(c); setIsModalHistoryOpen(true); }} style={{ background: '#161616', padding: '18px', borderRadius: '22px', borderLeft: `5px solid ${c.estado === 'activo' ? '#39FF14' : '#ff4444'}`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: '900', fontSize: '17px' }}>{c.nombre}</span>
                  <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={12} fill={i < c.calificacion ? "#FFD700" : "none"} color="#FFD700" />)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <Phone size={20} color="#0070f3" onClick={() => realizarLlamadaMinutos(c.telefono)} style={{ cursor: 'pointer' }} />
                  <a href={`https://wa.me/57${(c.telefono || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                    <MessageCircle size={22} color="#25D366" />
                  </a>
                  <Edit2 size={20} color="#39FF14" onClick={() => abrirAuth(c, 'cliente')} style={{ cursor: 'pointer' }} />
                </div>
              </div>
              
              {cuotaTotal > 0 && (
                <div style={{ marginTop: '12px', background: '#000', padding: '12px', borderRadius: '12px', border: '1px solid #333', boxShadow: 'inset 0 0 10px #39FF1411' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#888' }}>CUOTA TOTAL DIARIA ({prestamosActivos}):</span>
                    <ArrowUpRight size={14} color="#39FF14" />
                  </div>
                  <div style={{ color: '#39FF14', fontWeight: '900', fontSize: '22px' }}>{formatCurrency(cuotaTotal)}</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#555' }}>Toca para ver historial</span>
                <button onClick={(e) => { e.stopPropagation(); setClientePrestamo(c); setIsModalLoanOpen(true); }} style={{ backgroundColor: '#39FF14', color: 'black', border: 'none', padding: '8px 15px', borderRadius: '10px', fontSize: '11px', fontWeight: '900' }}>
                  NUEVO PRÉSTAMO
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL HISTORIAL DE PRÉSTAMOS */}
      {isModalHistoryOpen && clienteHistorial && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.98)', padding: '20px', overflowY: 'auto', zIndex: 4500 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#39FF14', margin: 0 }}>EXPEDIENTE: {clienteHistorial.nombre}</h3>
            <X onClick={() => setIsModalHistoryOpen(false)} size={30} />
          </div>

          <h4 style={{ color: '#39FF14', borderBottom: '1px solid #222', paddingBottom: '10px', fontSize: '12px' }}>PRÉSTAMOS EN CURSO</h4>
          {getPrestamosPorCliente(clienteHistorial.id).filter(p => p.cuotasRestantes > 0).length === 0 ? 
            <p style={{ color: '#555', fontSize: '12px' }}>No hay préstamos activos.</p> :
            getPrestamosPorCliente(clienteHistorial.id).filter(p => p.cuotasRestantes > 0).map(p => (
              <div key={p.id} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '15px', marginBottom: '10px', borderLeft: '4px solid #39FF14' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 'bold', color: '#39FF14' }}>{formatCurrency(p.montoTotal)}</span>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <Edit2 size={16} color="#aaa" onClick={() => abrirAuth(p, 'edit_prestamo')} />
                    <Trash2 size={16} color="#ff4444" onClick={() => abrirAuth(p, 'delete_prestamo')} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>{p.cuotasRestantes} días rest.</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>Cuota: {formatCurrency(p.cuotaDiaria)}</span>
                </div>
              </div>
            ))
          }

          <h4 style={{ color: '#666', borderBottom: '1px solid #222', paddingBottom: '10px', marginTop: '30px', fontSize: '12px' }}>HISTORIAL FINALIZADO</h4>
          {getPrestamosPorCliente(clienteHistorial.id).filter(p => p.cuotasRestantes <= 0).map(p => (
            <div key={p.id} style={{ background: '#111', padding: '15px', borderRadius: '15px', marginBottom: '10px', borderLeft: '4px solid #444', opacity: 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', color: '#fff' }}>{formatCurrency(p.montoTotal)}</span>
                <CheckCircle2 size={16} color="#39FF14" />
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>Pagado en su totalidad</div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL AUTH */}
      {isAuthModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.96)', zIndex: 5500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111', width: '100%', maxWidth: '350px', padding: '30px', borderRadius: '30px', border: '2px solid #39FF14', textAlign: 'center' }}>
            <Lock color="#39FF14" size={30} style={{ marginBottom: '15px' }} />
            <h3 style={{ color: '#39FF14', margin: '0 0 10px', fontWeight: '900' }}>ACCESO RESTRINGIDO</h3>
            <input type="password" placeholder="••••" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} style={{ ...inputStyle, textAlign: 'center', fontSize: '24px' }} autoFocus />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsAuthModalOpen(false)} style={{ flex: 1, background: '#222', border: 'none', padding: '15px', borderRadius: '12px', color: 'white' }}>CANCELAR</button>
              <button onClick={verificarAcceso} style={{ flex: 1, background: '#39FF14', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: '900' }}>ENTRAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN CLIENTE */}
      {isModalEditOpen && clienteEditando && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 5500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111', width: '100%', maxWidth: '420px', padding: '25px', borderRadius: '25px', border: '1px solid #39FF14' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}><h3 style={{ margin: 0, color: '#39FF14' }}>EDITAR EXPEDIENTE</h3><X onClick={() => setIsModalEditOpen(false)}/></div>
            <label style={labelStyle}>Nombre</label><input value={clienteEditando.nombre || ''} onChange={e => setClienteEditando({...clienteEditando, nombre: e.target.value})} style={inputStyle} />
            <label style={labelStyle}>Cédula</label><input value={clienteEditando.cedula || ''} onChange={e => setClienteEditando({...clienteEditando, cedula: e.target.value})} style={inputStyle} />
            <label style={labelStyle}>Teléfono</label><input value={clienteEditando.telefono || ''} onChange={e => setClienteEditando({...clienteEditando, telefono: e.target.value})} style={inputStyle} />
            <label style={labelStyle}>Dirección</label><input value={clienteEditando.direccion || ''} onChange={e => setClienteEditando({...clienteEditando, direccion: e.target.value})} style={inputStyle} />
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}><label style={labelStyle}>Estado</label><select value={clienteEditando.estado || 'activo'} onChange={e => setClienteEditando({...clienteEditando, estado: e.target.value})} style={inputStyle}><option value="activo">ACTIVO</option><option value="inactivo">INACTIVO</option></select></div>
              <div style={{ flex: 1 }}><label style={labelStyle}>Estrellas</label><input type="number" min="1" max="5" value={clienteEditando.calificacion || 5} onChange={e => setClienteEditando({...clienteEditando, calificacion: parseInt(e.target.value)})} style={inputStyle} /></div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => eliminarConClave(clienteEditando.id)} style={{ flex: 1, background: '#ff4444', border: 'none', padding: '15px', borderRadius: '12px', color: 'white' }}><Trash2/></button>
              <button onClick={guardarCambios} style={{ flex: 3, background: '#39FF14', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: '900' }}>ACTUALIZAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN PRÉSTAMO */}
      {isModalEditLoanOpen && editPrestamoData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 5600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111', width: '100%', maxWidth: '400px', padding: '25px', borderRadius: '25px', border: '1px solid #39FF14' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#39FF14' }}>EDITAR PRÉSTAMO</h3>
                <X onClick={() => setIsModalEditLoanOpen(false)}/>
            </div>
            
            <label style={labelStyle}>Monto Base (Sin Interés)</label>
            <input 
                type="text" 
                value={editPrestamoData.montoBase || ''} 
                onChange={e => setEditPrestamoData({...editPrestamoData, montoBase: formatCurrency(e.target.value)})} 
                style={{...inputStyle, fontSize: '18px', color: '#39FF14', fontWeight: 'bold'}} 
            />

            <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Interés (%)</label>
                    <input type="number" value={editPrestamoData.interes || ''} onChange={e => setEditPrestamoData({...editPrestamoData, interes: e.target.value})} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Días Restantes</label>
                    <input type="number" value={editPrestamoData.cuotasRestantes || ''} onChange={e => setEditPrestamoData({...editPrestamoData, cuotasRestantes: e.target.value})} style={inputStyle} />
                </div>
            </div>

            <div style={{ background: '#000', padding: '15px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #39FF1433' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '11px', color: '#666' }}>TOTAL RECALCULADO:</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>
                        {formatCurrency(((parseFloat((editPrestamoData.montoBase || '0').replace(/\D/g, "")) || 0) * (1 + (parseFloat(editPrestamoData.interes || '0') / 100))).toString())}
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#666' }}>NUEVA CUOTA:</span>
                    <span style={{ color: '#39FF14', fontWeight: '900', fontSize: '20px' }}>
                        {formatCurrency((((parseFloat((editPrestamoData.montoBase || '0').replace(/\D/g, "")) || 0) * (1 + (parseFloat(editPrestamoData.interes || '0') / 100))) / (parseInt(editPrestamoData.cuotasRestantes || '1') || 1)).toString())}
                    </span>
                </div>
            </div>

            <button onClick={guardarCambiosPrestamo} style={{ width: '100%', background: '#39FF14', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: '900', color: 'black' }}>GUARDAR CAMBIOS</button>
          </div>
        </div>
      )}

      {/* MODAL PRÉSTAMO NUEVO */}
      {isModalLoanOpen && clientePrestamo && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111', width: '100%', maxWidth: '400px', padding: '25px', borderRadius: '25px', border: '1px solid #39FF14' }}>
            <h3 style={{ color: '#39FF14', marginTop: 0 }}>NUEVO CRÉDITO: {clientePrestamo.nombre}</h3>
            <form onSubmit={crearPrestamo}>
              <label style={labelStyle}>Monto</label>
              <input type="text" placeholder="$ 0" value={prestamoData.monto} onChange={e => setPrestamoData({...prestamoData, monto: formatCurrency(e.target.value)})} style={{ ...inputStyle, fontSize: '18px', color: '#39FF14', fontWeight: 'bold' }} required />
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>Interés (%)</label><input type="number" value={prestamoData.interes} onChange={e => setPrestamoData({...prestamoData, interes: e.target.value})} style={inputStyle} required /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>Días</label><input type="number" value={prestamoData.cuotas} onChange={e => setPrestamoData({...prestamoData, cuotas: e.target.value})} style={inputStyle} required /></div>
              </div>

              <div style={{ background: '#000', padding: '15px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #39FF1433' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '11px', color: '#666' }}>TOTAL RECALCULADO:</span>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>
                    {formatCurrency(((parseFloat(prestamoData.monto.replace(/\D/g, "")) || 0) * (1 + (parseFloat(prestamoData.interes) / 100))).toString())}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#666' }}>CUOTA DIARIA:</span>
                  <span style={{ color: '#39FF14', fontWeight: '900', fontSize: '20px' }}>
                    {formatCurrency((((parseFloat(prestamoData.monto.replace(/\D/g, "")) || 0) * (1 + (parseFloat(prestamoData.interes) / 100))) / (parseInt(prestamoData.cuotas) || 1)).toString())}
                  </span>
                </div>
              </div>

              <button type="submit" style={{ width: '100%', background: '#39FF14', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: '900', color: 'black' }}>APROBAR CRÉDITO</button>
              <button type="button" onClick={() => setIsModalLoanOpen(false)} style={{ width: '100%', background: 'transparent', color: '#666', border: 'none', marginTop: '10px' }}>Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardCobrador;