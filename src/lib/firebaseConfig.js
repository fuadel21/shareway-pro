// Lee todas las variables de entorno para la configuración de Firebase
const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;
const FIREBASE_AUTH_DOMAIN = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const FIREBASE_STORAGE_BUCKET = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const FIREBASE_MESSAGING_SENDER_ID = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const FIREBASE_APP_ID = import.meta.env.VITE_FIREBASE_APP_ID;

// Variables para Stripe y Google Maps
const STRIPE_PUBLISHABLE_KEY_FROM_ENV = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const GOOGLE_MAPS_API_KEY_FROM_ENV = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// --- INICIO DE LA CORRECCIÓN ---
// Objeto de configuración de Firebase que utiliza las variables de entorno.
// Ahora, la configuración es dinámica y se basa en tu archivo .env.local.
export const FIREBASE_CONFIG = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  region: "us-central1" // Se mantiene la región, ya que es consistente.
};
// --- FIN DE LA CORRECCIÓN ---

// --- CLAVES EXPORTADAS Y SEGURAS ---
// Se exportan las claves de Stripe y Google Maps leídas desde el entorno.

/**
 * Clave publicable de Stripe.
 */
export const STRIPE_PUBLISHABLE_KEY = STRIPE_PUBLISHABLE_KEY_FROM_ENV;

/**
 * Clave de API de Google Maps.
 */
export const GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_API_KEY_FROM_ENV;

/**
 * Clave VAPID para Firebase Cloud Messaging (Push Notifications).
 * Obtén esta clave desde Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
 */
export const FIREBASE_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
