import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { AppError, handleFirebaseError } from '../lib/errors';

const cancelBookingFunction = httpsCallable(functions, 'cancelBookingAndRefund');

/**
 * Llama a la función de backend para cancelar una reserva y liberar los fondos.
 * @param {string} rideId - El ID del viaje del que se quiere cancelar la reserva.
 * @returns {Promise<object>} - El resultado de la función de backend.
 */
export const cancelBooking = async (rideId) => {
  if (!rideId) {
    throw new AppError('validation/missing-ride-id', "Falta el ID del viaje para cancelar.");
  }

  try {
    const result = await cancelBookingFunction({ rideId });
    return result.data;
  } catch (error) {
    throw handleFirebaseError(error, "al intentar cancelar tu reserva");
  }
};
