import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
// --- INICIO DE LA CORRECCIÓN ---
import { getFunctions } from "firebase/functions";
// --- FIN DE LA CORRECCIÓN ---

import { FIREBASE_CONFIG } from './firebaseConfig';

// Inicializa la aplicación de Firebase
export const app = initializeApp(FIREBASE_CONFIG);

// Exporta los servicios
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// --- INICIO DE LA CORRECCIÓN ---
// Se inicializan las funciones sin especificar la región aquí.
// La región se define en la configuración del proyecto y en cada función.
export const functions = getFunctions(app);
// --- FIN DE LA CORRECCIÓN ---

import { getMessaging } from "firebase/messaging";
export const messaging = getMessaging(app);
