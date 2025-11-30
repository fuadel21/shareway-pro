const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { performBooking } = require("./bookingLogic");

const REGION = "us-central1";
const db = admin.firestore();

// --- CONSTANTES DE NEGOCIO ---
const MIN_SEATS = 1;
const MAX_SEATS = 8;
const BASE_PRICE = 1.00; // Tarifa base en €
const PRICE_PER_KM = 0.50; // Tarifa por kilómetro en €
const PLATFORM_FEE_PERCENTAGE = 0.10; // Comisión de plataforma 10%

exports.createRide = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes estar autenticado para crear un viaje.");
    }

    const driverId = request.auth.uid;
    const data = request.data;
    const { origin, destination, dateTime, seats, details, distance, overview_polyline, routeCoordinates, bounds, isWomenOnly, price: clientPrice, isFreeRide } = data;

    if (!origin?.coordinates || !destination?.coordinates || !dateTime || !seats || !distance || !bounds) {
        throw new HttpsError("invalid-argument", "Faltan datos esenciales para crear el viaje.");
    }

    const numericSeats = Number(seats);
    if (isNaN(numericSeats) || numericSeats < MIN_SEATS || numericSeats > MAX_SEATS) {
        throw new HttpsError("invalid-argument", `El número de asientos debe estar entre ${MIN_SEATS} y ${MAX_SEATS}.`);
    }

    const rideDateTime = new Date(dateTime);
    if (rideDateTime <= new Date()) {
        throw new HttpsError("invalid-argument", "La fecha y hora del viaje deben ser en el futuro.");
    }

    const numericDistance = Number(distance);
    if (isNaN(numericDistance) || numericDistance <= 0) {
        throw new HttpsError("invalid-argument", "La distancia del viaje no es válida.");
    }

    const suggestedPrice = parseFloat((BASE_PRICE + numericDistance * PRICE_PER_KM).toFixed(2));
    let finalPrice = 0;

    if (isFreeRide) {
        finalPrice = 0;
    } else if (clientPrice !== undefined && clientPrice !== null) {
        const numericClientPrice = Number(clientPrice);
        if (isNaN(numericClientPrice) || numericClientPrice < 0) {
            throw new HttpsError("invalid-argument", "El precio proporcionado no es válido.");
        }

        const maxAllowed = suggestedPrice * 3;
        if (numericClientPrice > maxAllowed) {
            throw new HttpsError("invalid-argument", `El precio no puede exceder ${maxAllowed.toFixed(2)}€ (3x el precio sugerido de ${suggestedPrice.toFixed(2)}€).`);
        }

        finalPrice = parseFloat(numericClientPrice.toFixed(2));
    } else {
        finalPrice = suggestedPrice;
    }

    try {
        const driverDoc = await db.collection('users').doc(driverId).get();
        if (!driverDoc.exists) {
            throw new HttpsError("not-found", "No se encontró el perfil del conductor.");
        }

        const driverData = driverDoc.data();

        if (isWomenOnly && driverData.gender !== 'female') {
            throw new HttpsError("permission-denied", "Solo las conductoras pueden crear viajes marcados como \"solo para mujeres\".");
        }

        let formattedRouteCoordinates = null;
        if (Array.isArray(routeCoordinates)) {
            formattedRouteCoordinates = routeCoordinates.map(coord => {
                if (Array.isArray(coord) && coord.length >= 2) {
                    return { lng: coord[0], lat: coord[1] };
                }
                return coord;
            });
        }

        const newRide = {
            driver: { id: driverId, displayName: driverData.displayName || 'Conductor', photoURL: driverData.photoURL || null },
            origin, destination, dateTime: rideDateTime, seatsTotal: numericSeats,
            seatsAvailable: numericSeats, price: finalPrice, details: (details || '').trim(),
            distance: numericDistance,
            bounds,
            isWomenOnly: !!isWomenOnly,
            isFreeRide: !!isFreeRide,
            passengers: [], participantIds: [driverId], status: 'scheduled',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            overview_polyline: overview_polyline || null,
            routeCoordinates: formattedRouteCoordinates || null
        };

        const rideRef = await db.collection('rides').add(newRide);
        return { success: true, rideId: rideRef.id };

    } catch (error) {
        console.error("Error en createRide:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", `Error interno al crear viaje: ${error.message}`);
    }
});

exports.confirmTripAndPay = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado.");

    const { rideId, location } = request.data;
    const passengerId = request.auth.uid;
    const rideRef = db.collection('rides').doc(rideId);
    const passengerRef = db.collection('users').doc(passengerId);

    try {
        return db.runTransaction(async (transaction) => {
            const [rideDoc, passengerDoc] = await Promise.all([
                transaction.get(rideRef),
                transaction.get(passengerRef)
            ]);

            if (!rideDoc.exists) throw new HttpsError("not-found", "El viaje ya no existe.");
            if (!passengerDoc.exists) throw new HttpsError("not-found", "No se encontró tu perfil de usuario.");

            const userData = passengerDoc.data();

            return performBooking(transaction, rideRef, rideDoc, passengerId, userData, location);
        });
    } catch (error) {
        console.error(`Error en confirmTripAndPay para ${passengerId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo procesar la reserva.");
    }
});

exports.startRide = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado.");

    const { rideId, pin } = request.data;
    const userId = request.auth.uid;
    if (!rideId || !pin) throw new HttpsError("invalid-argument", "Faltan el ID del viaje o el PIN.");

    const rideRef = db.collection('rides').doc(rideId);

    try {
        const rideDoc = await rideRef.get();
        if (!rideDoc.exists) throw new HttpsError("not-found", "El viaje no existe.");

        const rideData = rideDoc.data();
        if (rideData.driver.id !== userId) throw new HttpsError("permission-denied", "Solo el conductor puede iniciar el viaje.");
        if (rideData.status !== 'scheduled') throw new HttpsError("failed-precondition", `El viaje no se puede iniciar porque su estado es '${rideData.status}'.`);

        const confirmedPassengers = rideData.passengers?.filter(p => p.status === 'confirmed') || [];
        if (confirmedPassengers.length === 0) throw new HttpsError("failed-precondition", "Se necesita al menos un pasajero confirmado para iniciar.");

        if (!confirmedPassengers.some(p => p.pin === pin)) throw new HttpsError("permission-denied", "El PIN no es correcto.");

        await rideRef.update({ status: 'in_progress' });
        return { success: true, message: "¡Viaje iniciado con éxito!" };

    } catch (error) {
        if (error instanceof HttpsError) throw error;
        console.error(`Error al iniciar el viaje ${rideId}:`, error);
        throw new HttpsError("internal", "Ocurrió un error inesperado al iniciar.");
    }
});

exports.completeRide = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado.");

    const { rideId } = request.data;
    if (!rideId) throw new HttpsError("invalid-argument", "Falta el ID del viaje.");

    const rideRef = db.collection('rides').doc(rideId);

    try {
        return db.runTransaction(async (transaction) => {
            const rideDoc = await transaction.get(rideRef);
            if (!rideDoc.exists) throw new HttpsError("not-found", "El viaje no existe.");

            const rideData = rideDoc.data();
            if (rideData.driver.id !== request.auth.uid) throw new HttpsError("permission-denied", "Solo el conductor puede completar el viaje.");
            if (rideData.status !== 'in_progress') throw new HttpsError("failed-precondition", "Solo se puede completar un viaje que está en curso.");

            const confirmedPassengers = rideData.passengers.filter(p => p.status === 'confirmed');

            const allPassengerIds = rideData.passengers.map(p => p.id);
            const updatedParticipantIds = [...new Set([...rideData.participantIds, ...allPassengerIds])];

            if (updatedParticipantIds.length > rideData.participantIds.length) {
                transaction.update(rideRef, { participantIds: updatedParticipantIds });
            }

            if (rideData.isFreeRide) {
                transaction.update(rideRef, { status: 'completed' });
                return { success: true, message: "Viaje gratuito completado." };
            }

            if (confirmedPassengers.length === 0) {
                transaction.update(rideRef, { status: 'completed' });
                return { success: true, message: "Viaje completado. No había pasajeros que pagar." };
            }

            const totalRevenue = rideData.price * confirmedPassengers.length;
            const platformFee = totalRevenue * PLATFORM_FEE_PERCENTAGE;
            const totalPayout = totalRevenue - platformFee;

            const driverWalletRef = db.collection('wallets').doc(rideData.driver.id);
            const passengerWalletRefs = confirmedPassengers.map(p => db.collection('wallets').doc(p.id));
            const passengerWalletDocs = await Promise.all(passengerWalletRefs.map(ref => transaction.get(ref)));

            passengerWalletDocs.forEach((doc) => {
                if (doc.exists) {
                    const walletData = doc.data();
                    const currentHeld = walletData.heldBalance || 0;

                    // FIX Bug #4: Lanzar error si hay inconsistencia
                    if (currentHeld < rideData.price) {
                        throw new Error(`Inconsistencia en wallet del pasajero ${doc.id}: saldo retenido insuficiente.`);
                    }

                    transaction.update(doc.ref, { heldBalance: admin.firestore.FieldValue.increment(-rideData.price) });
                }
            });

            transaction.update(driverWalletRef, { balance: admin.firestore.FieldValue.increment(totalPayout) });

            const platformFeesRef = db.collection('platform').doc('fees');
            transaction.set(platformFeesRef, {
                totalUncollected: admin.firestore.FieldValue.increment(platformFee)
            }, { merge: true });

            transaction.update(rideRef, { status: 'completed' });

            return { success: true, message: `Viaje completado. Se han añadido ${totalPayout.toFixed(2)}€ a tu balance (comisión: ${platformFee.toFixed(2)}€).` };
        });
    } catch (error) {
        console.error(`Error al completar el viaje ${rideId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo completar el viaje y transferir los fondos.");
    }
});

exports.cancelRide = onCall({ region: REGION, cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    const { rideId } = request.data;
    const rideRef = db.collection('rides').doc(rideId);

    try {
        return db.runTransaction(async (transaction) => {
            const rideDoc = await transaction.get(rideRef);
            if (!rideDoc.exists) throw new HttpsError("not-found", "El viaje no existe.");
            const rideData = rideDoc.data();

            if (rideData.driver.id !== request.auth.uid) throw new HttpsError("permission-denied", "Solo el conductor puede cancelar el viaje.");

            if (!['scheduled', 'in_progress'].includes(rideData.status)) {
                throw new HttpsError("failed-precondition", "Solo se pueden cancelar viajes programados o en curso.");
            }

            // FIX Bug #6: Solo reembolsar si NO es viaje gratuito
            if (!rideData.isFreeRide) {
                const passengerWalletRefs = rideData.passengers.map(p => db.collection('wallets').doc(p.id));
                if (passengerWalletRefs.length > 0) {
                    const passengerWalletDocs = await Promise.all(passengerWalletRefs.map(ref => transaction.get(ref)));

                    passengerWalletDocs.forEach(doc => {
                        if (doc.exists) {
                            const walletData = doc.data();
                            const currentHeld = walletData.heldBalance || 0;

                            // FIX Bug #5: Lanzar error si hay inconsistencia
                            if (currentHeld < rideData.price) {
                                throw new Error(`Inconsistencia en wallet del pasajero ${doc.id}: saldo retenido insuficiente.`);
                            }

                            transaction.update(doc.ref, {
                                balance: admin.firestore.FieldValue.increment(rideData.price),
                                heldBalance: admin.firestore.FieldValue.increment(-rideData.price)
                            });
                        }
                    });
                }
            }

            transaction.update(rideRef, { status: 'cancelled' });
            return { success: true, message: "El viaje ha sido cancelado y se han reembolsado los fondos." };
        });
    } catch (error) {
        console.error(`Error al cancelar el viaje ${rideId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "No se pudo cancelar el viaje.");
    }
});