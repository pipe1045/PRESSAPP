import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';

export const registrarPago = async (prestamoId, monto, metodo, clienteNombre) => {
  try {
    // 1. Registro en Flujo de Caja
    await addDoc(collection(db, "flujoCaja"), {
      tipo: 'ingreso',
      monto: Number(monto),
      metodo: metodo,
      concepto: `Pago de ${clienteNombre}`,
      fecha: serverTimestamp()
    });

    // 2. Actualizar el préstamo
    const ref = doc(db, "prestamos", prestamoId);
    await updateDoc(ref, {
      totalPagado: increment(monto)
    });

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};