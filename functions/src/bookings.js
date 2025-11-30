const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const db = admin.firestore();
const REGION = "us-central1";

const { performBooking } = require("./bookingLogic");

exports.requestSeatAndHoldFunds = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado.");

    const { rideId, location } = request.data;
    const userId = request.auth.uid;
    const userName = request.auth.token.name;
    const userPhoto = request.auth.token.picture;
    // Note: gender is not available in token usually, would need to fetch user doc if not passed.
    // However, performBooking fetches user doc? No, it takes userData.
    // Wait, performBooking takes userData. I need to fetch user doc here or pass what I have.
    // performBooking uses userData.gender for women-only check.
    // request.auth.token does NOT have gender.
    // So I MUST fetch user doc here to be safe, OR performBooking should fetch it?
    // performBooking expects userData.

    // Let's modify performBooking to fetch user doc if needed? 
    // No, better to fetch it here.

    const userRef = db.collection('users').doc(userId);

    try {
        return db.runTransaction(async (transaction) => {
            const rideRef = db.collection('rides').doc(rideId);
            const [rideDoc, userDoc] = await Promise.all([
                transaction.get(rideRef),
                transaction.get(userRef)
            ]);

            if (!rideDoc.exists) throw new HttpsError("not-found", "El viaje no existe.");
            if (!userDoc.exists) throw new HttpsError("not-found", "Usuario no encontrado.");

            const userData = userDoc.data();

            return performBooking(transaction, rideRef, rideDoc, userId, userData, location);
        });
    } catch (error) {
        console.error(`Error en requestSeatAndHoldFunds para ${userId} en viaje ${rideId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo completar la reserva.");
    }
});


exports.cancelBookingAndRefund = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado.");

    const { rideId } = request.data;
    const userId = request.auth.uid;
    const rideRef = db.collection('rides').doc(rideId);
    const walletRef = db.collection('wallets').doc(userId);

    try {
        await db.runTransaction(async (transaction) => {
            const rideDoc = await transaction.get(rideRef);
            if (!rideDoc.exists) throw new HttpsError("not-found", "El viaje ya no existe.");

            const rideData = rideDoc.data();
            const passengerIndex = rideData.passengers.findIndex(p => p.id === userId);
            if (passengerIndex === -1) throw new HttpsError("not-found", "No tienes una reserva en este viaje.");

            const walletDoc = await transaction.get(walletRef);
            if (!walletDoc.exists) throw new HttpsError("internal", `No se encontró la wallet del pasajero.`);

            // FIX Bug #1: No intentar reembolsar si es viaje gratuito
            if (!rideData.isFreeRide) {
                const passengerHeldBalance = walletDoc.data().heldBalance || 0;
                if (passengerHeldBalance < rideData.price) {
                    console.error(`Error de consistencia: El pasajero ${userId} cancela pero su saldo retenido (${passengerHeldBalance}) es menor que el precio del viaje (${rideData.price}).`);
                } else {
                    transaction.update(walletRef, {
                        balance: admin.firestore.FieldValue.increment(rideData.price),
                        heldBalance: admin.firestore.FieldValue.increment(-rideData.price)
                    });
                }
            }

            const updatedPassengers = rideData.passengers.filter(p => p.id !== userId);
            transaction.update(rideRef, {
                passengers: updatedPassengers,
                participantIds: admin.firestore.FieldValue.arrayRemove(userId),
                seatsAvailable: admin.firestore.FieldValue.increment(1)
            });

            // Notificar al conductor
            const passenger = rideData.passengers[passengerIndex];
            const notificationRef = db.collection('notifications').doc();
            transaction.set(notificationRef, {
                userId: rideData.driver.id,
                type: 'booking_cancelled',
                title: 'Reserva cancelada',
                message: `${passenger.displayName || 'Un pasajero'} ha cancelado su reserva.`,
                data: { rideId: rideId, passengerId: userId },
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return { success: true, message: "Reserva cancelada y fondos devueltos a tu wallet." };

    } catch (error) {
        console.error(`Error al cancelar reserva para ${userId} en ${rideId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo cancelar la reserva.");
    }
});


exports.confirmBookingAndTransferFunds = onCall({ region: REGION, cors: true }, async (request) => {
    // Esta función parece ser para otro flujo, se mantiene sin cambios
});

exports.createBookingPaymentIntent = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado.");

    const { rideId } = request.data;
    const userId = request.auth.uid;
    const walletRef = db.collection('wallets').doc(userId);
    const rideRef = db.collection('rides').doc(rideId);

    try {
        const [walletDoc, rideDoc] = await Promise.all([walletRef.get(), rideRef.get()]);

        if (!rideDoc.exists) throw new HttpsError("not-found", "El viaje no existe.");
        const rideData = rideDoc.data();
        const walletData = walletDoc.data() || { balance: 0 };

        if (rideData.seatsAvailable <= 0) throw new HttpsError("failed-precondition", "Viaje completo.");
        if (rideData.driver.id === userId) throw new HttpsError("failed-precondition", "No puedes reservar en tu propio viaje.");
        if (rideData.passengers.some(p => p.id === userId)) throw new HttpsError("already-exists", "Ya tienes una reserva.");

        const price = rideData.price;
        const balance = walletData.balance || 0;

        if (balance >= price) {
            // Tiene saldo suficiente, reservar directamente
            await db.runTransaction(async (transaction) => {
                // Re-leer documentos dentro de la transacción para consistencia
                const freshRideDoc = await transaction.get(rideRef);
                const userRef = db.collection('users').doc(userId);
                const freshUserDoc = await transaction.get(userRef);

                if (!freshRideDoc.exists) throw new HttpsError("not-found", "El viaje no existe.");
                if (!freshUserDoc.exists) throw new HttpsError("not-found", "Usuario no encontrado.");

                const userData = freshUserDoc.data();

                return performBooking(transaction, rideRef, freshRideDoc, userId, userData, null);
            });
            return { requiresPayment: false };
        } else {
            // No tiene saldo suficiente, crear PaymentIntent por la diferencia
            const amountToPay = price - balance;
            const amountInCents = Math.round(amountToPay * 100);

            // Mínimo de Stripe es 50 céntimos (50 cents)
            if (amountInCents < 50) {
                throw new HttpsError("failed-precondition", "La cantidad a pagar es menor al mínimo permitido por Stripe (0.50€). Por favor recarga tu wallet.");
            }

            const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'eur',
                automatic_payment_methods: { enabled: true },
                metadata: {
                    rideId: rideId,
                    userId: userId,
                    type: 'booking_payment' // Importante para el webhook
                }
            });

            return {
                requiresPayment: true,
                clientSecret: paymentIntent.client_secret
            };
        }
    } catch (error) {
        console.error(`Error en createBookingPaymentIntent:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", error.message);
    }
});
