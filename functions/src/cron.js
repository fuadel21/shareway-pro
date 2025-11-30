const functions = require('firebase-functions'); // V1 Import
const admin = require("firebase-admin");

const db = admin.firestore();
const REGION = "us-central1";

/**
 * Se ejecuta cada hora para limpiar y actualizar estados de la base de datos. (V1 Syntax)
 */
exports.hourlyCleanup = functions.region(REGION).pubsub
    .schedule('every 60 minutes')
    .onRun(async (context) => {
        console.log('Iniciando la tarea de limpieza horaria (V1)...');

        const now = admin.firestore.Timestamp.now();

        const expiredRidesQuery = db.collection('rides')
            .where('status', '==', 'scheduled')
            .where('dateTime', '<', now);

        try {
            const snapshot = await expiredRidesQuery.get();
            if (snapshot.empty) {
                console.log("No se encontraron viajes caducados para actualizar.");
                return null;
            }

            // FIX Bug #31: Refund passengers before marking as expired
            for (const doc of snapshot.docs) {
                const rideData = doc.data();
                console.log(`Procesando viaje expirado ${doc.id}`);

                // Reembolsar a pasajeros confirmados
                const passengers = rideData.passengers?.filter(p => p.status === 'confirmed') || [];

                for (const passenger of passengers) {
                    if (passenger.amountPaid && passenger.amountPaid > 0) {
                        try {
                            const walletRef = db.collection('wallets').doc(passenger.id);

                            await db.runTransaction(async (transaction) => {
                                const walletDoc = await transaction.get(walletRef);

                                if (!walletDoc.exists) {
                                    console.error(`Wallet no encontrada para pasajero ${passenger.id}`);
                                    return;
                                }

                                // Liberar fondos retenidos y añadir al balance
                                transaction.update(walletRef, {
                                    balance: admin.firestore.FieldValue.increment(passenger.amountPaid),
                                    heldBalance: admin.firestore.FieldValue.increment(-passenger.amountPaid)
                                });

                                // Registrar transacción de reembolso
                                const transactionRef = walletRef.collection('transactions').doc();
                                transaction.set(transactionRef, {
                                    type: 'refund',
                                    amount: passenger.amountPaid,
                                    reason: 'ride_expired',
                                    rideId: doc.id,
                                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                                });
                            });

                            console.log(`Reembolsados ${passenger.amountPaid}€ a pasajero ${passenger.id} por viaje expirado ${doc.id}`);
                        } catch (refundError) {
                            console.error(`Error reembolsando a pasajero ${passenger.id}:`, refundError);
                        }
                    }
                }

                // Marcar viaje como expirado
                await doc.ref.update({ status: 'expired' });
                console.log(`Viaje ${doc.id} marcado como expirado`);
            }

            console.log(`Se procesaron ${snapshot.size} viajes caducados con reembolsos.`);
            return null;

        } catch (error) {
            console.error("Error al actualizar los viajes caducados:", error);
            return null;
        }
    });
