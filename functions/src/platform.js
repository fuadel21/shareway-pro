const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { getStripeClient } = require("./stripeClient"); // Use the lazy loader

const db = admin.firestore();
const REGION = "us-central1";

/**
 * Helper to log unauthorized admin access attempts
 */
async function logUnauthorizedAccess(userId, functionName) {
    try {
        await db.collection('auditLogs').add({
            type: 'UNAUTHORIZED_ADMIN_ACCESS',
            userId,
            functionName,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error logging unauthorized access:', error);
    }
}

/**
 * Obtiene estadísticas básicas de la plataforma (ej. total de usuarios, total de viajes).
 * Solo para administradores.
 */
exports.getPlatformStats = onCall({ region: REGION, cors: true }, async (request) => {
    // FIX Bug #28: Double validation - custom claim + Firestore
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    }

    const userId = request.auth.uid;

    // Validar custom claim
    if (request.auth.token.role !== 'admin') {
        await logUnauthorizedAccess(userId, 'getPlatformStats');
        throw new HttpsError("permission-denied", "Esta función solo puede ser llamada por un administrador.");
    }

    // Validar en Firestore (doble verificación)
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
        await logUnauthorizedAccess(userId, 'getPlatformStats');
        throw new HttpsError("permission-denied", "Esta función solo puede ser llamada por un administrador.");
    }

    try {
        const usersPromise = db.collection('users').get();
        const ridesPromise = db.collection('rides').get();
        const feesPromise = db.collection('platform').doc('fees').get();

        const [usersSnapshot, ridesSnapshot, feesDoc] = await Promise.all([usersPromise, ridesPromise, feesPromise]);

        return {
            totalUsers: usersSnapshot.size,
            totalRides: ridesSnapshot.size,
            uncollectedFees: feesDoc.data()?.totalUncollected || 0,
        };
    } catch (error) {
        console.error("Error al obtener estadísticas de la plataforma:", error);
        throw new HttpsError("internal", "No se pudieron cargar las estadísticas.");
    }
});

/**
 * Inicia una transferencia de Stripe para pagar las comisiones acumuladas a la cuenta bancaria de la plataforma.
 * Solo para administradores.
 */
exports.requestPlatformPayout = onCall({ region: REGION, cors: true }, async (request) => {
    // FIX Bug #28: Double validation
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    }

    const userId = request.auth.uid;

    // Validar custom claim
    if (request.auth.token.role !== 'admin') {
        await logUnauthorizedAccess(userId, 'requestPlatformPayout');
        throw new HttpsError("permission-denied", "Esta función solo puede ser llamada por un administrador.");
    }

    // Validar en Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
        await logUnauthorizedAccess(userId, 'requestPlatformPayout');
        throw new HttpsError("permission-denied", "Esta función solo puede ser llamada por un administrador.");
    }

    const platformFeesRef = db.collection('platform').doc('fees');

    try {
        return db.runTransaction(async (transaction) => {
            const feesDoc = await transaction.get(platformFeesRef);
            if (!feesDoc.exists) {
                throw new HttpsError("not-found", "No se encontraron registros de comisiones.");
            }

            const totalUncollectedFees = feesDoc.data().totalUncollected || 0;
            if (totalUncollectedFees <= 0) {
                throw new HttpsError("failed-precondition", "No hay comisiones para retirar.");
            }

            const stripe = getStripeClient();
            const amountInCents = Math.round(totalUncollectedFees * 100);

            const transfer = await stripe.transfers.create({
                amount: amountInCents,
                currency: "eur",
                destination: process.env.STRIPE_BANK_ACCOUNT_ID,
                description: `Retiro de comisiones de la plataforma - ${new Date().toLocaleDateString()}`,
            });

            transaction.update(platformFeesRef, { totalUncollected: 0 });

            // Log successful payout
            await db.collection('auditLogs').add({
                type: 'PLATFORM_PAYOUT',
                userId,
                amount: totalUncollectedFees,
                transferId: transfer.id,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, message: `Se ha iniciado una transferencia de ${totalUncollectedFees.toFixed(2)}€.` };
        });

    } catch (error) {
        console.error("Error al solicitar el retiro de comisiones:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Ocurrió un error inesperado al procesar el retiro.");
    }
});
