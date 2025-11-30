import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { AppError, handleFirebaseError } from '../lib/errors';

/**
 * Llama a la Cloud Function 'createRideRequest' para que un pasajero publique una nueva solicitud.
 * @param {object} requestData - Los datos de la solicitud (origen, destino, etc.).
 * @returns {Promise<string>} El ID de la solicitud creada.
 */
export const createSingleRequest = async (requestData) => {
    if (!requestData.origin?.coordinates || !requestData.destination?.coordinates) {
        throw new AppError('validation/no-coords', "Las coordenadas de origen y destino no son válidas.");
    }

    try {
        const createRequestFunction = httpsCallable(functions, 'createRideRequest');

        const dataToSend = {
            origin: requestData.origin,
            destination: requestData.destination,
            dateTime: requestData.dateTime.toISOString(),
            seats: requestData.seats,
            suggestedPrice: requestData.suggestedPrice,
            details: requestData.details,
            isFlexibleTime: requestData.isFlexibleTime || false,
            timeRangeEnd: requestData.timeRangeEnd || null,
        };

        const result = await createRequestFunction(dataToSend);

        if (result?.data?.success) {
            return result.data.requestId;
        } else {
            const errorMessage = result?.data?.message || 'La función no pudo completar la operación.';
            throw new AppError('function/execution-failed', errorMessage);
        }

    } catch (error) {
        console.error("Error al llamar a la función createRideRequest:", error);
        throw handleFirebaseError(error, "al crear la solicitud");
    }
};
