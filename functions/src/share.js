const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require('crypto');

const db = admin.firestore();
const REGION = "us-central1";

/**
 * Generates a secure share token for a ride if one doesn't exist.
 * Returns the public tracking URL.
 */
exports.getRideShareLink = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { rideId } = request.data;
    if (!rideId) {
        throw new HttpsError("invalid-argument", "Ride ID is required.");
    }

    const rideRef = db.collection('rides').doc(rideId);
    const rideDoc = await rideRef.get();

    if (!rideDoc.exists) {
        throw new HttpsError("not-found", "Ride not found.");
    }

    const rideData = rideDoc.data();

    // Verify user is a participant (driver or passenger)
    const isDriver = rideData.driver.id === request.auth.uid;
    const isPassenger = rideData.passengers?.some(p => p.id === request.auth.uid && p.status === 'confirmed');

    if (!isDriver && !isPassenger) {
        throw new HttpsError("permission-denied", "You can only share rides you are part of.");
    }

    // Return existing token if available
    if (rideData.shareToken) {
        return {
            shareToken: rideData.shareToken,
            url: `${request.rawRequest.headers.origin}/track/${rideData.shareToken}`
        };
    }

    // Generate new token
    const shareToken = crypto.randomBytes(16).toString('hex');

    await rideRef.update({
        shareToken: shareToken,
        shareTokenCreatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
        shareToken: shareToken,
        url: `${request.rawRequest.headers.origin}/track/${shareToken}`
    };
});

/**
 * Fetches public ride details using a share token.
 * No authentication required.
 */
exports.getPublicRideDetails = onCall({ region: REGION, cors: true }, async (request) => {
    const { shareToken } = request.data;

    if (!shareToken) {
        throw new HttpsError("invalid-argument", "Share token is required.");
    }

    const ridesSnapshot = await db.collection('rides')
        .where('shareToken', '==', shareToken)
        .limit(1)
        .get();

    if (ridesSnapshot.empty) {
        throw new HttpsError("not-found", "Ride not found or link expired.");
    }

    const rideDoc = ridesSnapshot.docs[0];
    const ride = rideDoc.data();

    // Filter sensitive data - only return what's needed for tracking
    const publicData = {
        id: rideDoc.id,
        status: ride.status,
        origin: ride.origin,
        destination: ride.destination,
        driver: {
            displayName: ride.driver.displayName,
            photoURL: ride.driver.photoURL,
            vehicle: ride.driver.vehicle
        },
        // Don't return full passenger list for privacy
        seatsAvailable: ride.seatsAvailable,
        departureTime: ride.departureTime,
        distance: ride.distance,
        duration: ride.duration
    };

    return publicData;
});
