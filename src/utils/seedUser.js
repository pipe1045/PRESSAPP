// src/utils/seedUser.js
import { db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export const crearSuperUsuario = async () => {
  // Usaremos un ID fijo para tu primer ingreso
  const adminId = "admin_principal"; 
  
  try {
    await setDoc(doc(db, "usuarios", adminId), {
      nombre: "Andres Amaya",
      correo: "admin@presapp.com", // Este será tu correo de login
      identificacion: "12345", 
      rol: "admin", // Importante: esto te da todos los permisos
      activo: true
    });
    console.log("✅ ¡SuperUsuario creado en Firebase!");
    alert("Usuario Creado: Usa admin@presapp.com para entrar.");
  } catch (error) {
    console.error("❌ Error al crear:", error);
  }
};
