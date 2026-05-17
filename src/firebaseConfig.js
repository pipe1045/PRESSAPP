import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrpds9SFvoyXIwtg0UWXlAYxDP0--yCl4",
  authDomain: "pressapp-1.firebaseapp.com",
  projectId: "pressapp-1",
  storageBucket: "pressapp-1.firebasestorage.app",
  messagingSenderId: "284257487248",
  appId: "1:284257487248:web:c97aeb8c70f299726c4b15"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);