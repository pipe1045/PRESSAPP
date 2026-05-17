import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Zap, ArrowRight, ShieldCheck, User } from 'lucide-react';

const Login = ({ setUser }) => {
  const [tipo, setTipo] = useState('cliente');
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const manejarLogin = async () => {
    setError('');
    if (tipo === 'cliente') {
      const q = query(collection(db, "clientes"), where("cedula", "==", id));
      const snap = await getDocs(q);
      if (!snap.empty) setUser({ ...snap.docs[0].data(), rol: 'cliente' });
      else setError('Cédula no registrada');
    } else {
      // Validación Admin/Cobrador en Firebase
      const q = query(collection(db, "usuarios"), where("usuario", "==", id), where("pass", "==", pass));
      const snap = await getDocs(q);
      if (!snap.empty) setUser(snap.docs[0].data());
      else if (id === "admin" && pass === "1234") setUser({ nombre: "Admin Principal", rol: "admin" });
      else setError('Credenciales incorrectas');
    }
  };

  const s = {
    bg: { backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    card: { width: '350px', backgroundColor: '#111', padding: '40px', borderRadius: '30px', border: '1px solid #222', textAlign: 'center' },
    input: { width: '100%', padding: '15px', marginBottom: '10px', borderRadius: '12px', border: '1px solid #222', backgroundColor: '#000', color: '#fff', outline: 'none' },
    btn: { width: '100%', padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#39FF14', color: '#000', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }
  };

  return (
    <div style={s.bg}>
      <div style={s.card}>
        <Zap size={40} color="#39FF14" style={{ marginBottom: '20px' }} />
        <h2 style={{ letterSpacing: '3px', fontWeight: '900' }}>PRESS<span style={{ color: '#39FF14' }}>APP</span></h2>
        
        <div style={{ display: 'flex', gap: '5px', margin: '20px 0', backgroundColor: '#000', padding: '5px', borderRadius: '10px' }}>
          <button onClick={() => setTipo('cliente')} style={{ flex: 1, padding: '10px', background: tipo === 'cliente' ? '#222' : 'transparent', color: tipo === 'cliente' ? '#39FF14' : '#555', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>CLIENTE</button>
          <button onClick={() => setTipo('staff')} style={{ flex: 1, padding: '10px', background: tipo === 'staff' ? '#222' : 'transparent', color: tipo === 'staff' ? '#39FF14' : '#555', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>STAFF</button>
        </div>

        <input placeholder={tipo === 'cliente' ? "Cédula" : "Usuario"} style={s.input} onChange={e => setId(e.target.value)} />
        {tipo === 'staff' && <input type="password" placeholder="Contraseña" style={s.input} onChange={e => setPass(e.target.value)} />}
        
        {error && <p style={{ color: 'red', fontSize: '10px' }}>{error}</p>}
        <button onClick={manejarLogin} style={s.btn}>ENTRAR <ArrowRight size={15} /></button>
      </div>
    </div>
  );
};

export default Login;