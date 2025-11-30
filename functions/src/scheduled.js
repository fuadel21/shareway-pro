const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

const db = admin.firestore();

// Función scheduled que se ejecuta cada hora para expirar viajes antiguos
exports.expireOldRides = onSchedule({
    schedule: "every 1 hours",
    timeZone: "Europe/Madrid",
    region: "us-central1"
}, async (event) => {
    console.log("Running expireOldRides scheduled function...");

    const now = admin.firestore.Timestamp.now();

    // Buscar viajes programados cuya fecha ya pasó
    const expiredRidesQuery = db.collection('rides')
        .where('status', '==', 'scheduled')
        .where('dateTime', '<', now);

    const snapshot = await expiredRidesQuery.get();

    if (snapshot.empty) {
        console.log('No expired rides found');
        return null;
    }

    console.log(`Found ${snapshot.size} expired rides to process`);

    // Procesar en lotes de 500 (límite de Firestore batch)
    const batchSize = 500;
    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;
    let expiredCount = 0;

    for (const doc of snapshot.docs) {
        const rideData = doc.data();

        // Marcar como expirado
        currentBatch.update(doc.ref, { status: 'expired' });
        operationCount++;

        // FIX Bug #13: Solo reembolsar si NO es viaje gratuito
        if (!rideData.isFreeRide) {
            // Reembolsar pasajeros
            for (const passenger of rideData.passengers || []) {
                if (operationCount >= batchSize) {
                    batches.push(currentBatch);
                    currentBatch = db.batch();
                    operationCount = 0;
                }

                const walletRef = db.collection('wallets').doc(passenger.id);
                currentBatch.update(walletRef, {
                    balance: admin.firestore.FieldValue.increment(rideData.price),
                    heldBalance: admin.firestore.FieldValue.increment(-rideData.price)
                });
                operationCount++;

                // Notificar pasajero
                if (operationCount >= batchSize) {
                    batches.push(currentBatch);
                    currentBatch = db.batch();
                    operationCount = 0;
                }

                const passengerNotifRef = db.collection('notifications').doc();
                currentBatch.set(passengerNotifRef, {
                    userId: passenger.id,
                    type: 'ride_expired',
                    title: 'Viaje expirado',
                    message: 'Un viaje programado ha expirado. Se ha reembolsado tu dinero.',
                    data: { rideId: doc.id },
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                operationCount++;
            }
        }

        // Notificar conductor
        if (operationCount >= batchSize) {
            batches.push(currentBatch);
            currentBatch = db.batch();
            operationCount = 0;
        }

        const driverNotifRef = db.collection('notifications').doc();
        currentBatch.set(driverNotifRef, {
            userId: rideData.driver.id,
            type: 'ride_expired',
            title: 'Viaje expirado',
            message: 'Un viaje programado ha expirado automáticamente.',
            data: { rideId: doc.id },
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        operationCount++;

        expiredCount++;
    }

    // Añadir el último batch si tiene operaciones
    if (operationCount > 0) {
        batches.push(currentBatch);
    }

    // Ejecutar todos los batches
    await Promise.all(batches.map(batch => batch.commit()));

    console.log(`Successfully expired ${expiredCount} rides`);
    return null;
});
