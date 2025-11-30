const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();
const REGION = "us-central1";

const ACHIEVEMENTS = {
    FIRST_RIDE_PASSENGER: {
        id: 'FIRST_RIDE_PASSENGER',
        title: 'Primer Viaje (Pasajero)',
        description: 'Completaste tu primer viaje como pasajero.',
        icon: '🚗',
        xp: 100
    },
    FIRST_RIDE_DRIVER: {
        id: 'FIRST_RIDE_DRIVER',
        title: 'Primer Viaje (Conductor)',
        description: 'Completaste tu primer viaje como conductor.',
        icon: 'steering-wheel',
        xp: 150
    },
    VETERAN_PASSENGER: {
        id: 'VETERAN_PASSENGER',
        title: 'Pasajero Frecuente',
        description: 'Has completado 10 viajes como pasajero.',
        icon: 'medal',
        xp: 500,
        target: 10
    },
    VETERAN_DRIVER: {
        id: 'VETERAN_DRIVER',
        title: 'Conductor Experto',
        description: 'Has completado 10 viajes como conductor.',
        icon: 'trophy',
        xp: 1000,
        target: 10
    },
    FIVE_STAR_DRIVER: {
        id: 'FIVE_STAR_DRIVER',
        title: 'Excelencia al Volante',
        description: 'Recibiste una calificación de 5 estrellas.',
        icon: 'star',
        xp: 200
    }
};

/**
 * Helper to unlock an achievement for a user
 */
async function unlockAchievement(userId, achievementId) {
    const userRef = db.collection('users').doc(userId);
    const achievementRef = userRef.collection('achievements').doc(achievementId);

    const doc = await achievementRef.get();
    if (doc.exists) return; // Already unlocked

    const achievement = ACHIEVEMENTS[achievementId];

    await achievementRef.set({
        ...achievement,
        unlockedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send notification
    const userDoc = await userRef.get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (fcmToken) {
        await admin.messaging().send({
            notification: {
                title: '¡Logro Desbloqueado!',
                body: `Has conseguido: ${achievement.title}`
            },
            token: fcmToken
        });
    }

    console.log(`Achievement ${achievementId} unlocked for user ${userId}`);
}

/**
 * Trigger: Check achievements when a ride is updated (completed)
 */
exports.checkRideAchievements = onDocumentUpdated({
    document: "rides/{rideId}",
    region: REGION
}, async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Only run when ride is completed
    if (before.status !== 'completed' && after.status === 'completed') {

        // 1. Check Driver Achievements
        const driverId = after.driver.id;

        // Count completed rides as driver
        const driverRidesSnapshot = await db.collection('rides')
            .where('driver.id', '==', driverId)
            .where('status', '==', 'completed')
            .count()
            .get();

        const driverRideCount = driverRidesSnapshot.data().count;

        if (driverRideCount >= 1) {
            await unlockAchievement(driverId, 'FIRST_RIDE_DRIVER');
        }
        if (driverRideCount >= 10) {
            await unlockAchievement(driverId, 'VETERAN_DRIVER');
        }

        // 2. Check Passenger Achievements
        const passengers = after.passengers?.filter(p => p.status === 'confirmed') || [];

        for (const p of passengers) {
            // Count completed rides as passenger (this is expensive if done frequently, optimization needed for scale)
            // For now, we'll just check "First Ride" if it's their first time, or maybe we store stats in user profile
            // Better approach: Increment a counter in user profile.

            // Let's assume we update user stats elsewhere, or just do the query for now (small scale)
            // To be safe/fast, let's just check First Ride for now or rely on a counter if we had one.
            // We'll do the query for this MVP phase.

            // Note: Firestore doesn't have a simple "array-contains" for complex objects in 'passengers'.
            // We'd need to query rides where passengers array contains an object with id... which is hard.
            // Alternative: We rely on the 'my-rides' logic or just check if they have 0 previous rides?
            // Let's just unlock FIRST_RIDE_PASSENGER blindly if they don't have it? No.

            // Optimization: We will just unlock FIRST_RIDE_PASSENGER always, the unlock function checks if it exists.
            // But that's not "First". It's "Has Ridden".
            // Let's check if they have the achievement already.

            const achRef = db.collection('users').doc(p.id).collection('achievements').doc('FIRST_RIDE_PASSENGER');
            const achDoc = await achRef.get();
            if (!achDoc.exists) {
                await unlockAchievement(p.id, 'FIRST_RIDE_PASSENGER');
            }

            // For Veteran, we'd need a counter. Let's skip Veteran Passenger for now to avoid expensive queries.
        }
    }
});

/**
 * Callable: Get user achievements
 */
exports.getUserAchievements = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const userId = request.data.userId || request.auth.uid;
    const snapshot = await db.collection('users').doc(userId).collection('achievements').get();

    return snapshot.docs.map(doc => doc.data());
});
