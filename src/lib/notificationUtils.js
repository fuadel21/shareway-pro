import { messaging, db } from './firebase';
import { getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { toast } from 'sonner';
import { FIREBASE_VAPID_KEY } from './firebaseConfig';

/**
 * Solicita permiso para notificaciones push y obtiene el token FCM.
 * Si no hay VAPID key configurada, simplemente retorna null sin causar errores.
 */
export const requestNotificationPermission = async (userId) => {
    try {
        // Validar que existe una VAPID key válida antes de intentar obtener el token
        if (!FIREBASE_VAPID_KEY || FIREBASE_VAPID_KEY === 'PLACEHOLDER_VAPID_KEY' || FIREBASE_VAPID_KEY.length < 20) {
            console.warn('⚠️ VAPID key no configurada. Las notificaciones push no estarán disponibles.');
            console.warn('Para habilitar notificaciones, configura VITE_FIREBASE_VAPID_KEY en tu archivo .env.local');
            return null;
        }

        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            console.log('✅ Notification permission granted.');

            // Obtener el token
            try {
                // Sanitize VAPID key: remove whitespace and quotes
                let cleanVapidKey = FIREBASE_VAPID_KEY ? FIREBASE_VAPID_KEY.trim().replace(/['"]/g, '') : '';

                if (!cleanVapidKey || cleanVapidKey === 'PLACEHOLDER_VAPID_KEY') {
                    console.warn('⚠️ VAPID key no válida o placeholder.');
                    return null;
                }

                const token = await getToken(messaging, {
                    vapidKey: cleanVapidKey
                });

                if (token) {
                    console.log('✅ FCM Token obtenido:', token.substring(0, 20) + '...');
                    // Guardar token en Firestore
                    await saveTokenToDatabase(token, userId);
                    return token;
                } else {
                    console.log('⚠️ No se pudo obtener el token de registro.');
                    return null;
                }
            } catch (tokenError) {
                console.error('❌ Error específico al obtener getToken:', tokenError);
                console.error('VAPID Key usada:', FIREBASE_VAPID_KEY);
                throw tokenError; // Re-lanzar para que lo capture el catch externo
            }
        } else {
            console.log('⚠️ Permiso de notificaciones denegado por el usuario.');
            return null;
        }
    } catch (error) {
        console.error('❌ Error al obtener token de notificaciones:', error);
        // No mostrar toast de error para no molestar al usuario
        return null;
    }
};

const saveTokenToDatabase = async (token, userId) => {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        fcmToken: token,
        fcmTokens: arrayUnion(token) // Opcional: guardar historial de tokens
    });
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            console.log("payload", payload);
            resolve(payload);
        });
    });
