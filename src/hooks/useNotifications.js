import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, db } from '../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { FIREBASE_VAPID_KEY } from '@/lib/firebaseConfig';

export const useNotifications = (user) => {

    // 1. Listener para notificaciones en primer plano (sin cambios)
    useEffect(() => {
        if (!user) return;
        const messaging = getMessaging(app);
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Notificación en primer plano:', payload);
            toast.info(payload.notification.title, {
                description: payload.notification.body,
                duration: 8000
            });
        });
        return () => unsubscribe();
    }, [user]);

    // 2. Lógica para solicitar permiso y guardar el token (MEJORADA)
    useEffect(() => {
        const setupToken = async () => {
            // Salir si no hay usuario, si no estamos en un navegador, o si el navegador no soporta notificaciones
            if (!user || typeof window === 'undefined' || !('Notification' in window)) {
                return;
            }

            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                // Si el usuario no existe en la DB o ya tiene un token, no hacemos nada más
                if (!userDoc.exists() || userDoc.data().fcmToken) {
                    return;
                }

                // Si no tiene token, pedimos permiso
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    console.log('El usuario no ha concedido permiso para notificaciones.');
                    return;
                }

                // Si da permiso, obtenemos el token y lo guardamos
                const messaging = getMessaging(app);
                const currentToken = await getToken(messaging, { vapidKey: FIREBASE_VAPID_KEY });

                if (currentToken) {
                    await updateDoc(userDocRef, { fcmToken: currentToken });
                    console.log('Token FCM guardado en Firestore por primera vez.');
                } else {
                    console.warn('No se pudo obtener el token de registro de FCM.');
                }

            } catch (err) {
                console.error('Error crítico al configurar las notificaciones:', err);
                // No lanzamos toast de error aquí para no ser intrusivos en cada carga
            }
        };

        setupToken();

    }, [user]); // Se ejecuta solo cuando el objeto de usuario cambia
};
