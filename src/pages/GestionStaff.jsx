import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { UserPlus, Trash2, Shield, Smartphone } from 'lucide-react';

const GestionStaff = () => {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ nombre: '', usuario: '', pass: '', rol: 'cobrador' });

  // 1. Cargar cobradores existentes
  const cargarStaff = async () => {
    const querySnapshot = await getDocs(collection(db, "usuarios"));
    const lista = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    setStaff(lista.filter(u => u.rol !== 'admin')); // No mostrar al admin en la lista de borrar
  };

  useEffect(() => { cargarStaff(); }, []);

  // 2. Guardar nuevo cobrador
  const guardar = async () => {
    if (!form.usuario || !form.pass) return alert("Completa usuario y clave");
    await addDoc(collection(db, "usuarios"), form);
    setForm({ nombre: '', usuario: '', pass: '', rol: 'cobrador' });
    cargarStaff();
    alert("¡Cobrador activado!");
  };

  // 3. Eliminar cobrador
  const eliminar = async (id) => {
    if (window.confirm("¿Quitar acceso a este cobrador?")) {
      await deleteDoc(doc(db, "usuarios", id));
      cargarStaff();
    }
  };

  const s = {
    card: { backgroundColor: '#111', padding: '20px', borderRadius: '25px', border: '1px solid #222', marginBottom: '20px' },
    input: { width: '100%', padding: '15px', backgroundColor: '#000', border: '1px solid #222', borderRadius: '15px', color: '#fff', marginBottom: '10px', boxSizing: 'border-box', outline: 'none' },
    btn: { width: '100%', padding: '15px', backgroundColor: '#39FF14', color: '#000', border: 'none', borderRadius: '15px', fontWeight: '900', cursor: 'pointer' },
    item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #222' }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
      
      {/* FORMULARIO DE REGISTRO */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <UserPlus color="#39FF14" />
          <h3 style={{ fontSize: '14px', fontWeight: '900' }}>NUEVO COBRADOR</h3>
        </div>
        <input style={s.input} placeholder="Nombre Real" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
        <input style={s.input} placeholder="Usuario (Ej: andres_cobro)" value={form.usuario} onChange={e => setForm({...form, usuario: e.target.value})} />
        <input style={s.input} type="password" placeholder="Contraseña" value={form.pass} onChange={e => setForm({...form, pass: e.target.value})} />
        <button style={s.btn} onClick={guardar}>REGISTRAR EN SISTEMA</button>
      </div>

      {/* LISTA DE ACCESOS ACTIVOS */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <Shield color="#39FF14" size={18} />
          <h3 style={{ fontSize: '12px', fontWeight: '900' }}>ACCESOS ACTIVOS</h3>
        </div>
        {staff.map(u => (
          <div key={u.id} style={s.item}>
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{u.nombre}</p>
              <p style={{ margin: 0, fontSize: '10px', color: '#555' }}>User: {u.usuario} | Rol: {u.rol}</p>
            </div>
            <button onClick={() => eliminar(u.id)} style={{ background: 'none', border: 'none', color: '#ff4444' }}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};

export default GestionStaff;