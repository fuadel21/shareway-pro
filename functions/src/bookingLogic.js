const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");

/**
 * Lógica centralizada para reservar un asiento.
 * Valida todas las condiciones de negocio y realiza la actualización transaccional.
 * 
 * @param {admin.firestore.Transaction} transaction - La transacción de Firestore en curso.
 * @param {admin.firestore.DocumentReference} rideRef - Referencia al documento del viaje.
 * @param {admin.firestore.DocumentSnapshot} rideDoc - Snapshot del documento del viaje (ya leído en la transacción).
 * @param {string} userId - ID del usuario que reserva.
 * @param {object} userData - Datos del usuario (displayName, photoURL, gender).
 * @param {object} pickupLocation - Ubicación de recogida (opcional).
 * @returns {Promise<{success: boolean}>}
 */
const performBooking = async (transaction, rideRef, rideDoc, userId, userData, pickupLocation = null) => {
    const db = admin.firestore();
    const walletRef = db.collection('wallets').doc(userId);
    const walletDoc = await transaction.get(walletRef);

    if (!walletDoc.exists) throw new HttpsError("not-found", "No se encontró tu wallet.");

    const rideData = rideDoc.data();
    const walletData = walletDoc.data();

    // --- VALIDACIONES ---

    // 1. Validar estado del viaje
    if (rideData.status !== 'scheduled') {
        throw new HttpsError("failed-precondition", "Este viaje ya no acepta nuevos pasajeros.");
    }

    // 2. Validar disponibilidad
    if (rideData.seatsAvailable <= 0) {
        throw new HttpsError("failed-precondition", "Lo sentimos, el último asiento acaba de ser reservado.");
    }

    // 3. Validar conductor vs pasajero
    if (rideData.driver.id === userId) {
        throw new HttpsError("failed-precondition", "No puedes reservar en tu propio viaje.");
    }

    // 4. Validar si ya es pasajero
    if (rideData.participantIds.includes(userId)) {
        throw new HttpsError("already-exists", "Ya tienes una reserva en este viaje.");
    }

    // 5. Validar restricciones de género (Solo Mujeres)
    if (rideData.isWomenOnly && userData.gender !== 'female') {
        throw new HttpsError("permission-denied", "Este es un viaje solo para mujeres.");
    }

    // 6. Validar saldo (si no es gratuito)
    if (!rideData.isFreeRide && walletData.balance < rideData.price) {
        throw new HttpsError("failed-precondition", "No tienes saldo suficiente en tu wallet.");
    }

    // --- ACTUALIZACIONES ---

    const ridePin = Math.floor(1000 + Math.random() * 9000).toString();
    const newPassenger = {
        id: userId,
        displayName: userData.displayName || 'Pasajero',
        photoURL: userData.photoURL || null,
        status: 'confirmed',
        pin: ridePin,
        pickupLocation: pickupLocation || null
    };

    // Cobrar (retener fondos) si no es gratuito
    if (!rideData.isFreeRide) {
        transaction.update(walletRef, {
            balance: admin.firestore.FieldValue.increment(-rideData.price),
            heldBalance: admin.firestore.FieldValue.increment(rideData.price)
        });
    }

    // Actualizar viaje
    transaction.update(rideRef, {
        passengers: admin.firestore.FieldValue.arrayUnion(newPassenger),
        participantIds: admin.firestore.FieldValue.arrayUnion(userId),
        seatsAvailable: admin.firestore.FieldValue.increment(-1)
    });

    return { success: true };
};

module.exports = { performBooking };
