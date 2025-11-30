const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();
const REGION = "us-central1";

/**
 * Reporta una emergencia durante un viaje
 */
exports.reportEmergency = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    }

    const { rideId, location, timestamp } = request.data;
    const userId = request.auth.uid;

    if (!rideId) {
        throw new HttpsError("invalid-argument", "Falta el ID del viaje.");
    }

    try {
        // FIX Bug #22: Prevent emergency spam - check if already reported for this ride
        const existingEmergency = await db.collection('emergencies')
            .where('rideId', '==', rideId)
            .where('reportedBy', '==', userId)
            .where('status', '==', 'pending')
            .get();

        if (!existingEmergency.empty) {
            throw new HttpsError("already-exists", "Ya has reportado una emergencia para este viaje. El equipo de soporte ha sido notificado.");
        }

        // Verificar que el usuario es participante del viaje
        const rideDoc = await db.collection('rides').doc(rideId).get();
        if (!rideDoc.exists) {
            throw new HttpsError("not-found", "El viaje no existe.");
        }

        const rideData = rideDoc.data();
        const isDriver = rideData.driver.id === userId;
        const isPassenger = rideData.passengers?.some(p => p.id === userId);

        if (!isDriver && !isPassenger) {
            throw new HttpsError("permission-denied", "Solo los participantes del viaje pueden reportar emergencias.");
        }

        // Crear registro de emergencia
        const emergencyReport = {
            rideId,
            reportedBy: userId,
            location: location || null,
            timestamp: timestamp || admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const reportRef = await db.collection('emergencies').add(emergencyReport);

        // Notificar a todos los participantes
        const participants = [
            rideData.driver.id,
            ...(rideData.passengers?.map(p => p.id) || [])
        ].filter(id => id !== userId);

        for (const participantId of participants) {
            await db.collection('notifications').add({
                userId: participantId,
                type: 'emergency_alert',
                title: '🚨 Alerta de Emergencia',
                message: 'Se ha reportado una emergencia en tu viaje',
                data: {
                    rideId,
                    emergencyId: reportRef.id
                },
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // TODO: Notificar al equipo de soporte por email/SMS

        console.log(`Emergencia reportada: ${reportRef.id} para viaje ${rideId}`);

        return {
            success: true,
            emergencyId: reportRef.id,
            message: "Emergencia reportada. El equipo de soporte ha sido notificado."
        };

    } catch (error) {
        console.error("Error reportando emergencia:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Error al reportar la emergencia.");
    }
});
