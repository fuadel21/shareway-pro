const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { Client } = require("@googlemaps/google-maps-services-js");

const db = admin.firestore();
const client = new Client({});

// TODO: Get API Key from environment variables
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Calculates ETA between two points or for a specific ride
 */
exports.calculateETA = onCall({ region: "us-central1", cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { origin, destination, rideId } = request.data;

    let originLoc = origin;
    let destLoc = destination;

    // If rideId is provided, fetch locations from the ride
    if (rideId) {
        const rideDoc = await db.collection('rides').doc(rideId).get();
        if (!rideDoc.exists) {
            throw new HttpsError("not-found", "Ride not found.");
        }
        const rideData = rideDoc.data();

        // FIX Bug #26: Validate user has permission to access this ride
        const isDriver = rideData.driver.id === request.auth.uid;
        const isPassenger = rideData.passengers?.some(p => p.id === request.auth.uid);

        if (!isDriver && !isPassenger) {
            throw new HttpsError("permission-denied", "No tienes acceso a este viaje.");
        }

        // If ride is in progress, origin should be driver's current location (if available)
        // For now, we'll fall back to ride origin if driver location isn't tracked real-time in this context
        originLoc = rideData.origin.location; // { lat, lng }
        destLoc = rideData.destination.location;
    }

    if (!originLoc || !destLoc) {
        throw new HttpsError("invalid-argument", "Origin and destination are required.");
    }

    try {
        // If we don't have an API key configured for backend, we can't use the Google Maps Client
        // For this demo/phase, we might need to mock it or use a simple Haversine formula if key is missing
        if (!GOOGLE_MAPS_API_KEY) {
            console.warn("Google Maps API Key not found in environment. Using Haversine approximation.");
            return calculateHaversineETA(originLoc, destLoc);
        }

        const response = await client.distancematrix({
            params: {
                origins: [{ lat: originLoc.lat, lng: originLoc.lng }],
                destinations: [{ lat: destLoc.lat, lng: destLoc.lng }],
                key: GOOGLE_MAPS_API_KEY,
            },
            timeout: 1000, // milliseconds
        });

        if (response.data.rows[0].elements[0].status === 'OK') {
            const element = response.data.rows[0].elements[0];
            return {
                distance: element.distance.text,
                duration: element.duration.text,
                durationValue: element.duration.value, // seconds
                eta: new Date(Date.now() + element.duration.value * 1000).toISOString()
            };
        } else {
            throw new Error("Distance Matrix API error");
        }

    } catch (error) {
        console.error("Error calculating ETA:", error);
        // Fallback to Haversine
        return calculateHaversineETA(originLoc, destLoc);
    }
});

function calculateHaversineETA(origin, destination) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(destination.lat - origin.lat);
    const dLon = deg2rad(destination.lng - origin.lng);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(origin.lat)) * Math.cos(deg2rad(destination.lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km

    // Assume average speed of 40 km/h in city
    const speed = 40;
    const timeHours = d / speed;
    const timeSeconds = timeHours * 3600;

    return {
        distance: `${d.toFixed(1)} km`,
        duration: `${Math.round(timeHours * 60)} mins`,
        durationValue: Math.round(timeSeconds),
        eta: new Date(Date.now() + timeSeconds * 1000).toISOString(),
        isEstimate: true
    };
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
