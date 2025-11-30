import { functions, db } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'; // --- Añadido ---
import { AppError, handleFirebaseError } from '../lib/errors';

/**
 * Llama a la Cloud Function 'addFunds' para procesar una recarga con Stripe.
 */
export const addFundsToWallet = async (amount, paymentMethodId) => {
  try {
    if (!amount || amount <= 0 || !paymentMethodId) {
      throw new AppError('validation/missing-params', "Se requiere una cantidad y un método de pago.");
    }
    const addFundsFunction = httpsCallable(functions, 'addFunds');
    const result = await addFundsFunction({ amount, paymentMethodId });

    if (result && result.data) {
      return result.data;
    }

    return { success: false, message: 'La respuesta del servidor fue inesperada o nula.' };

  } catch (error) {
    console.error("Error al llamar a addFundsFunction:", error);
    throw handleFirebaseError(error, "al procesar la recarga");
  }
};

/**
 * Llama a la Cloud Function 'requestPayout' para iniciar un retiro de saldo.
 */
export const requestPayout = async (amount) => {
  try {
    const requestPayoutFunction = httpsCallable(functions, 'requestPayout');
    const result = await requestPayoutFunction({ amount });
    if (result && result.data) {
        return result.data;
    }
    return { success: false, message: 'La respuesta del servidor fue inesperada.' };
  } catch (error) {
    console.error("Error al llamar a requestPayoutFunction:", error);
    throw handleFirebaseError(error, "al solicitar el pago");
  }
};

/**
 * Obtiene el historial de transacciones de un usuario en tiempo real.
 */
export const onTransactionsUpdate = (userId, onUpdate) => {
    if (!userId) {
        onUpdate([]);
        return () => {}; // Devuelve una función de desuscripción vacía
    }

    const transactionsRef = collection(db, `wallets/${userId}/transactions`);
    const q = query(transactionsRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        onUpdate(transactions);
    }, (error) => {
        console.error("Error al obtener las transacciones:", error);
        toast.error("No se pudo cargar el historial de transacciones.");
        onUpdate([]);
    });

    return unsubscribe; // Devuelve la función real para desuscribirse del listener
};
