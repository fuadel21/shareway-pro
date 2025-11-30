const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getStripeClient } = require("./stripeClient");

const db = admin.firestore();
const REGION = "us-central1";
const PLATFORM_FEE_PERCENTAGE = 0.10;

/**
 * Procesa una recarga de fondos usando un PaymentMethod ID proporcionado por el cliente.
 */
exports.addFunds = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    }
    const { amount, paymentMethodId } = request.data;
    const uid = request.auth.uid;

    // --- FIX: Validar mínimo y máximo ---
    const MIN_FUNDS = 5;
    const MAX_FUNDS_PER_TRANSACTION = 500;

    if (!amount || amount < MIN_FUNDS || !paymentMethodId) {
        throw new HttpsError("invalid-argument", `Se requiere una cantidad válida (mínimo ${MIN_FUNDS}€) y un método de pago.`);
    }

    if (amount > MAX_FUNDS_PER_TRANSACTION) {
        throw new HttpsError("invalid-argument", `El máximo por transacción es ${MAX_FUNDS_PER_TRANSACTION}€.`);
    }
    // -------------------------------------

    try {
        const stripe = getStripeClient();
        const amountInCents = Math.round(amount * 100);

        // 1. Obtener o crear el cliente de Stripe
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        let stripeCustomerId = userDoc.data()?.stripeCustomerId;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: request.auth.token.email,
                name: userDoc.data()?.displayName,
                metadata: { firebaseUID: uid }
            });
            stripeCustomerId = customer.id;
            await userRef.update({ stripeCustomerId });
        }

        // 2. Crear y confirmar el PaymentIntent en un solo paso
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'eur',
            customer: stripeCustomerId,
            payment_method: paymentMethodId,
            confirm: true,
            automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
            metadata: { firebaseUID: uid }
        });

        // 3. Manejar el resultado
        if (paymentIntent.status === 'succeeded') {
            // Éxito inmediato: actualizar el wallet
            const walletRef = db.collection('wallets').doc(uid);

            await db.runTransaction(async (transaction) => {
                transaction.update(walletRef, { balance: admin.firestore.FieldValue.increment(amount) });

                // Use paymentIntent.id as document ID for idempotency
                const transactionRef = walletRef.collection('transactions').doc(paymentIntent.id);
                transaction.set(transactionRef, {
                    type: 'deposit',
                    amount: amount,
                    stripePaymentIntentId: paymentIntent.id,
                    status: 'completed',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    description: 'Recarga de saldo via Stripe (Directa)'
                });
            });

            return { success: true };

        } else if (paymentIntent.status === 'requires_action') {
            // Se necesita 3D Secure: devolver el client_secret al frontend
            return { success: false, requiresAction: true, clientSecret: paymentIntent.client_secret };

        } else {
            // Cualquier otro estado es un fallo
            throw new Error(`El pago falló con el estado: ${paymentIntent.status}`);
        }

    } catch (error) {
        console.error("Error en addFunds:", error.message);
        // Devuelve un mensaje de error más claro al cliente
        throw new HttpsError("internal", error.message || "No se pudo procesar el pago.");
    }
});

exports.requestPayout = onCall({ region: REGION, cors: true }, async (request) => {
    console.warn("requestPayout no está implementado.");
    throw new HttpsError("unimplemented", "La función de retirar fondos no está implementada.");
});

// El resto del archivo (handleRideCompletion, etc.) permanece igual...

const transferFundsToDriver = async (rideData, rideId) => {
    const driverId = rideData.driver?.id;
    if (!driverId) throw new Error(`El viaje ${rideId} no tiene un conductor asignado.`);

    const confirmedPassengers = rideData.passengers?.filter(p => p.status === 'confirmed') || [];
    if (confirmedPassengers.length === 0) {
        return db.collection('rides').doc(rideId).update({ paymentProcessed: true });
    }

    const pricePerPassenger = rideData.price;
    const platformFeePerPassenger = pricePerPassenger * PLATFORM_FEE_PERCENTAGE;
    const amountForDriverPerPassenger = pricePerPassenger - platformFeePerPassenger;

    const driverWalletRef = db.collection('wallets').doc(driverId);
    const platformFeesRef = db.collection('platform').doc('fees');

    return db.runTransaction(async (transaction) => {
        let totalAmountForDriver = 0;
        let totalPlatformFee = 0;

        for (const passenger of confirmedPassengers) {
            const passengerWalletRef = db.collection('wallets').doc(passenger.id);
            const passengerWalletDoc = await transaction.get(passengerWalletRef);
            if (!passengerWalletDoc.exists || (passengerWalletDoc.data().heldBalance || 0) < pricePerPassenger) {
                throw new Error(`El pasajero ${passenger.id} no tiene suficientes fondos retenidos.`);
            }
            transaction.update(passengerWalletRef, { heldBalance: admin.firestore.FieldValue.increment(-pricePerPassenger) });
            totalAmountForDriver += amountForDriverPerPassenger;
            totalPlatformFee += platformFeePerPassenger;
        }

        transaction.update(driverWalletRef, { balance: admin.firestore.FieldValue.increment(totalAmountForDriver) });
        transaction.set(platformFeesRef, { totalUncollected: admin.firestore.FieldValue.increment(totalPlatformFee) }, { merge: true });
        transaction.update(db.collection('rides').doc(rideId), { paymentProcessed: true });
    });
};

const refundFundsToPassengers = async (rideData, rideId) => {
    const confirmedPassengers = rideData.passengers?.filter(p => p.status === 'confirmed') || [];

    if (confirmedPassengers.length === 0) {
        console.log(`No passengers to refund for ride ${rideId}`);
        return db.collection('rides').doc(rideId).update({ paymentProcessed: true });
    }

    console.log(`Refunding ${confirmedPassengers.length} passengers for ride ${rideId}`);

    return db.runTransaction(async (transaction) => {
        for (const passenger of confirmedPassengers) {
            const walletRef = db.collection('wallets').doc(passenger.id);
            const walletDoc = await transaction.get(walletRef);

            if (walletDoc.exists) {
                const walletData = walletDoc.data();
                const heldBalance = walletData.heldBalance || 0;

                // Validar antes de reembolsar
                if (heldBalance >= rideData.price) {
                    transaction.update(walletRef, {
                        balance: admin.firestore.FieldValue.increment(rideData.price),
                        heldBalance: admin.firestore.FieldValue.increment(-rideData.price)
                    });
                    console.log(`Refunded ${rideData.price}€ to passenger ${passenger.id}`);
                } else {
                    console.error(`Wallet inconsistency for passenger ${passenger.id}: heldBalance=${heldBalance}, expected=${rideData.price}`);
                }
            } else {
                console.error(`Wallet not found for passenger ${passenger.id}`);
            }
        }

        transaction.update(db.collection('rides').doc(rideId), {
            paymentProcessed: true
        });
    });
};

exports.handleRideCompletion = async (event) => {
    const afterData = event.data.after.data();
    const rideId = event.data.after.id;

    if (afterData.paymentProcessed || event.data.before.data().status === afterData.status) return null;

    try {
        if (afterData.status === 'completed') await transferFundsToDriver(afterData, rideId);
        if (afterData.status === 'cancelled') await refundFundsToPassengers(afterData, rideId);
        return null;
    } catch (error) {
        console.error(`Error procesando el pago para ${rideId}:`, error);
        return db.collection('rides').doc(rideId).update({ paymentError: error.message });
    }
};
