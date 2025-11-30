const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();
const REGION = "us-central1";

exports.requestToJoinInProgressRide = onCall({ region: REGION, cors: true }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Debes estar autenticado.");
        }

        const { rideId, location } = request.data;
        if (!rideId) {
            throw new HttpsError("invalid-argument", "Se requiere el ID del viaje.");
        }

        const requesterId = request.auth.uid;
        const rideRef = db.collection('rides').doc(rideId);
        const rideDoc = await rideRef.get();

        if (!rideDoc.exists) {
            throw new HttpsError("not-found", "El viaje no existe.");
        }

        const rideData = rideDoc.data();

        if (rideData.status !== 'in_progress') throw new HttpsError("failed-precondition", "Solo puedes unirte a viajes en curso.");
        if (rideData.seatsAvailable <= 0) throw new HttpsError("failed-precondition", "No quedan asientos.");
        if (rideData.driver.id === requesterId || rideData.passengers.some(p => p.id === requesterId)) throw new HttpsError("failed-precondition", "Ya formas parte de este viaje.");
        if (rideData.pendingJoinRequests?.some(req => req.id === requesterId)) throw new HttpsError("already-exists", "Ya has enviado una solicitud.");

        const requesterProfile = await db.collection('users').doc(requesterId).get();
        const newRequest = {
            id: requesterId,
            displayName: requesterProfile.data()?.displayName || 'Alguien',
            photoURL: requesterProfile.data()?.photoURL || null,
            requestedAt: new Date(),
            pickupLocation: location || null // <-- Guardar ubicación
        };

        await rideRef.update({
            pendingJoinRequests: admin.firestore.FieldValue.arrayUnion(newRequest)
        });

        return { success: true, message: "Tu solicitud ha sido enviada al conductor." };

    } catch (error) {
        console.error("Error detallado en requestToJoinInProgressRide:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", error.message || "Ocurrió un error inesperado en el servidor.");
    }
});

exports.respondToJoinRequest = onCall({ region: REGION, cors: true }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Debes estar autenticado.");
        }

        const { rideId, requesterId, action } = request.data;
        if (!rideId || !requesterId || !action) {
            throw new HttpsError("invalid-argument", "Faltan parámetros.");
        }

        const driverId = request.auth.uid;
        const rideRef = db.collection('rides').doc(rideId);

        await db.runTransaction(async (transaction) => {
            const rideDoc = await transaction.get(rideRef);
            if (!rideDoc.exists) throw new HttpsError("not-found", "El viaje ya no existe.");

            const rideData = rideDoc.data();
            if (rideData.driver.id !== driverId) throw new HttpsError("permission-denied", "No eres el conductor de este viaje.");

            const pendingRequests = rideData.pendingJoinRequests || [];
            const requestIndex = pendingRequests.findIndex(req => req.id === requesterId);
            if (requestIndex === -1) throw new HttpsError("not-found", "La solicitud ya no existe.");

            const theRequest = pendingRequests[requestIndex];
            const updatedRequests = pendingRequests.filter(req => req.id !== requesterId);

            if (action === 'accept') {
                if (rideData.seatsAvailable <= 0) throw new HttpsError("failed-precondition", "No quedan asientos.");

                // FIX Bug #10: Validar restricción de género
                const requesterRef = db.collection('users').doc(requesterId);
                const requesterDoc = await transaction.get(requesterRef);
                if (!requesterDoc.exists) throw new HttpsError("not-found", "Usuario no encontrado.");

                const requesterData = requesterDoc.data();
                if (rideData.isWomenOnly && requesterData.gender !== 'female') {
                    throw new HttpsError("permission-denied", "Este es un viaje solo para mujeres.");
                }

                // FIX Bug #9: Cobrar al pasajero si no es viaje gratuito
                if (!rideData.isFreeRide) {
                    const walletRef = db.collection('wallets').doc(requesterId);
                    const walletDoc = await transaction.get(walletRef);

                    if (!walletDoc.exists) throw new HttpsError("not-found", "Wallet no encontrada.");

                    const walletData = walletDoc.data();
                    if (walletData.balance < rideData.price) {
                        throw new HttpsError("failed-precondition",
                            `El pasajero no tiene saldo suficiente. Requiere ${rideData.price}€ pero solo tiene ${walletData.balance}€.`);
                    }

                    // Retener fondos
                    transaction.update(walletRef, {
                        balance: admin.firestore.FieldValue.increment(-rideData.price),
                        heldBalance: admin.firestore.FieldValue.increment(rideData.price)
                    });
                }

                const ridePin = Math.floor(1000 + Math.random() * 9000).toString();

                const newPassenger = {
                    id: theRequest.id,
                    displayName: theRequest.displayName,
                    photoURL: theRequest.photoURL,
                    status: 'confirmed',
                    pickupLocation: theRequest.pickupLocation || null,
                    pin: ridePin
                };
                transaction.update(rideRef, {
                    passengers: admin.firestore.FieldValue.arrayUnion(newPassenger),
                    participantIds: admin.firestore.FieldValue.arrayUnion(requesterId),
                    seatsAvailable: admin.firestore.FieldValue.increment(-1),
                    pendingJoinRequests: updatedRequests
                });
            } else {
                // Rechazar solicitud
                const notificationRef = db.collection('notifications').doc();
                transaction.set(notificationRef, {
                    userId: requesterId,
                    type: 'join_request_rejected',
                    title: 'Solicitud rechazada',
                    message: `Tu solicitud para unirte al viaje fue rechazada por el conductor.`,
                    data: { rideId: rideId },
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });

                transaction.update(rideRef, { pendingJoinRequests: updatedRequests });
            }
        });

        return { success: true, message: `Solicitud ${action === 'accept' ? 'aceptada' : 'rechazada'}.` };

    } catch (error) {
        console.error("Error detallado en respondToJoinRequest:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", error.message || "Ocurrió un error al procesar la solicitud.");
    }
});
