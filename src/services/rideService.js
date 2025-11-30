import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { AppError, handleFirebaseError } from '../lib/errors';

/**
 * Llama a la Cloud Function 'createRide' para que un conductor publique un nuevo viaje.
 * @param {object} rideData - Los datos del viaje (origen, destino, etc.).
 * @returns {Promise<string>} El ID del viaje creado.
 */
export const createSingleRide = async (rideData) => {
    if (!rideData.origin?.coordinates || !rideData.destination?.coordinates) {
        throw new AppError('validation/no-coords', "Las coordenadas de origen y destino no son válidas.");
    }
    // OSRM provides 'coordinates' array instead of 'overview_polyline' string
    if (!rideData.coordinates || !rideData.distance) {
        throw new AppError('validation/no-route-data', "Los datos de la ruta (distancia, coordenadas) son necesarios.");
    }

    try {
        const createRideFunction = httpsCallable(functions, 'createRide');

        const dataToSend = {
            origin: rideData.origin,
            destination: rideData.destination,
            dateTime: rideData.dateTime.toISOString(),
            seats: rideData.seats,
            price: rideData.price,
            details: rideData.details || '',
            distance: rideData.distance,
            // Send coordinates directly or encode them if backend expects polyline
            // For now, we'll send coordinates and let backend handle it or store it as is
            routeCoordinates: rideData.coordinates,
            // We can also generate a simple polyline string if needed for legacy compatibility
            // but for now let's use the new field
            bounds: rideData.bounds,
            isWomenOnly: rideData.isWomenOnly || false,
        };

        const result = await createRideFunction(dataToSend);

        if (result?.data?.success) {
            return result.data.rideId;
        } else {
            const errorMessage = result?.data?.message || 'La función no pudo completar la operación.';
            throw new AppError('function/execution-failed', errorMessage);
        }

    } catch (error) {
        console.error("Error al llamar a la función createRide:", error);
        throw handleFirebaseError(error, "al publicar el viaje");
    }
};

/**
 * Llama a la Cloud Function 'submitReview' para guardar una reseña de un viaje.
 * @param {object} reviewData - Los datos de la reseña.
 * @returns {Promise<{success: boolean}>}
 */
export const submitReview = async (reviewData) => {
    try {
        const submitReviewFunction = httpsCallable(functions, 'submitReview');
        const result = await submitReviewFunction(reviewData);
        if (result?.data?.success) {
            return { success: true };
        } else {
            const errorMessage = result?.data?.message || 'La función no pudo guardar la reseña.';
            throw new AppError('function/execution-failed', errorMessage);
        }
    } catch (error) {
        console.error("Error al llamar a la función submitReview:", error);
        throw handleFirebaseError(error, "al guardar la reseña");
    }
};

/**
 * Llama a la Cloud Function 'saveFavoriteRoute' para guardar una ruta como favorita.
 * @param {object} routeData - Los datos de la ruta.
 * @returns {Promise<{success: boolean, favoriteRouteId: string}>}
 */
export const saveFavoriteRoute = async (routeData) => {
    try {
        const saveFavoriteRouteFunction = httpsCallable(functions, 'saveFavoriteRoute');
        const result = await saveFavoriteRouteFunction(routeData);
        if (result?.data?.success) {
            return { success: true, favoriteRouteId: result.data.favoriteRouteId };
        } else {
            const errorMessage = result?.data?.message || 'La función no pudo guardar la ruta favorita.';
            throw new AppError('function/execution-failed', errorMessage);
        }
    } catch (error) {
        console.error("Error al llamar a la función saveFavoriteRoute:", error);
        throw handleFirebaseError(error, "al guardar la ruta favorita");
    }
};
