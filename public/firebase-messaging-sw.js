importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configuración de Firebase
// NOTA: Reemplaza 'PLACEHOLDER_APP_ID' con tu Web App ID real de la consola de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDLnj-S_NCUV5EQlPgAMPE9A1-nBPDYYa0",
    authDomain: "taxi-compartido-v2.firebaseapp.com",
    projectId: "taxi-compartido-v2",
    storageBucket: "taxi-compartido-v2.firebasestorage.app",
    messagingSenderId: "821458894201",
    appId: "PLACEHOLDER_APP_ID"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Manejar notificaciones en segundo plano
messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/pwa-192x192.png', // Asegúrate de tener este icono o usa uno por defecto
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
