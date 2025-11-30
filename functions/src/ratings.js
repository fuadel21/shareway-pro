const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();
const REGION = "us-central1";

/**
 * Crea una valoración para un usuario después de un viaje
 */
exports.createRating = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    }

    const { rideId, ratedUserId, rating, comment } = request.data;
    const raterId = request.auth.uid;

    // Validaciones
    if (!rideId || !ratedUserId || !rating) {
        throw new HttpsError("invalid-argument", "Faltan datos requeridos.");
    }

    if (rating < 1 || rating > 5) {
        throw new HttpsError("invalid-argument", "La valoración debe estar entre 1 y 5.");
    }

    if (raterId === ratedUserId) {
        throw new HttpsError("invalid-argument", "No puedes valorarte a ti mismo.");
    }

    try {
        // Verificar que el viaje existe y está completado
        const rideDoc = await db.collection('rides').doc(rideId).get();
        if (!rideDoc.exists) {
            throw new HttpsError("not-found", "El viaje no existe.");
        }

        const rideData = rideDoc.data();
        if (rideData.status !== 'completed') {
            throw new HttpsError("failed-precondition", "Solo puedes valorar viajes completados.");
        }

        // FIX Missing #2: Validate comment length
        if (comment && comment.length > 500) {
            throw new HttpsError("invalid-argument", "El comentario no puede exceder 500 caracteres.");
        }

        // Verificar que el usuario fue parte del viaje
        const isDriver = rideData.driver.id === raterId;
        const isPassenger = rideData.passengers?.some(p => p.id === raterId);

        if (!isDriver && !isPassenger) {
            throw new HttpsError("permission-denied", "No formaste parte de este viaje.");
        }

        // Verificar que el usuario calificado fue parte del viaje
        const ratedIsDriver = rideData.driver.id === ratedUserId;
        const ratedIsPassenger = rideData.passengers?.some(p => p.id === ratedUserId);

        if (!ratedIsDriver && !ratedIsPassenger) {
            throw new HttpsError("invalid-argument", "El usuario a calificar no formó parte de este viaje.");
        }

        // Verificar que no ha calificado antes
        const existingRating = await db.collection('ratings')
            .where('rideId', '==', rideId)
            .where('raterId', '==', raterId)
            .where('ratedUserId', '==', ratedUserId)
            .get();

        if (!existingRating.empty) {
            throw new HttpsError("already-exists", "Ya has valorado a este usuario para este viaje.");
        }

        // Determinar el rol del usuario calificado
        const ratedUserRole = ratedIsDriver ? 'driver' : 'passenger';

        // Crear la valoración
        await db.collection('ratings').add({
            rideId,
            raterId,
            ratedUserId,
            rating,
            comment: comment || '',
            role: ratedUserRole,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Actualizar estadísticas del usuario calificado
        await updateUserRatingStats(ratedUserId);

        return { success: true, message: "Valoración enviada con éxito." };

    } catch (error) {
        console.error("Error en createRating:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Error al crear la valoración.");
    }
});

/**
 * Obtiene las valoraciones de un usuario
 */
exports.getUserRatings = onCall({ region: REGION, cors: true }, async (request) => {
    const { userId, limit = 10 } = request.data;

    if (!userId) {
        throw new HttpsError("invalid-argument", "Falta el ID del usuario.");
    }

    try {
        const ratingsSnapshot = await db.collection('ratings')
            .where('ratedUserId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        const ratings = [];
        for (const doc of ratingsSnapshot.docs) {
            const ratingData = doc.data();

            // Obtener info del calificador
            const raterDoc = await db.collection('users').doc(ratingData.raterId).get();
            const raterData = raterDoc.data();

            ratings.push({
                id: doc.id,
                ...ratingData,
                raterName: raterData?.displayName || 'Usuario',
                raterPhoto: raterData?.photoURL || null
            });
        }

        return { ratings };

    } catch (error) {
        console.error("Error en getUserRatings:", error);
        throw new HttpsError("internal", "Error al obtener las valoraciones.");
    }
});

/**
 * Actualiza las estadísticas de valoración de un usuario
 */
async function updateUserRatingStats(userId) {
    const ratingsSnapshot = await db.collection('ratings')
        .where('ratedUserId', '==', userId)
        .get();

    if (ratingsSnapshot.empty) {
        return;
    }

    let totalRating = 0;
    let count = 0;
    let asDriverRating = 0;
    let asDriverCount = 0;
    let asPassengerRating = 0;
    let asPassengerCount = 0;

    ratingsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        totalRating += data.rating;
        count++;

        if (data.role === 'driver') {
            asDriverRating += data.rating;
            asDriverCount++;
        } else {
            asPassengerRating += data.rating;
            asPassengerCount++;
        }
    });

    const ratingStats = {
        average: parseFloat((totalRating / count).toFixed(2)),
        count: count,
        asDriver: {
            average: asDriverCount > 0 ? parseFloat((asDriverRating / asDriverCount).toFixed(2)) : 0,
            count: asDriverCount
        },
        asPassenger: {
            average: asPassengerCount > 0 ? parseFloat((asPassengerRating / asPassengerCount).toFixed(2)) : 0,
            count: asPassengerCount
        }
    };

    await db.collection('users').doc(userId).update({ ratingStats });
}
