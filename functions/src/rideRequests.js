const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const { calculateMatchScore, isCompatible } = require('./matchingUtils');

const REGION = "us-central1";
const db = admin.firestore();

exports.createRideRequest = onCall({ region: REGION, cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado para solicitar un viaje.");
  }

  const { origin, destination, dateTime, seats, suggestedPrice, details } = request.data;
  console.log("createRideRequest data:", { origin, destination, dateTime, seats, suggestedPrice });

  if (!origin?.address || !origin?.coordinates || !destination?.address || !destination?.coordinates || !dateTime || !seats || suggestedPrice == null) {
    console.error("Missing data in createRideRequest:", { origin, destination, dateTime, seats, suggestedPrice });
    throw new HttpsError("invalid-argument", "Faltan datos esenciales (origen, destino, fecha, asientos o precio).");
  }
  if (typeof seats !== 'number' || seats <= 0) {
    throw new HttpsError("invalid-argument", "El número de asientos no es válido.");
  }
  if (typeof suggestedPrice !== 'number' || suggestedPrice < 0) {
    throw new HttpsError("invalid-argument", "La contribución sugerida no es válida.");
  }
  const rideDateTime = new Date(dateTime);
  if (rideDateTime <= new Date()) {
    throw new HttpsError("invalid-argument", "La fecha y hora de la solicitud deben ser en el futuro.");
  }

  // Validate coordinates
  const originLat = Number(origin.coordinates.lat);
  const originLng = Number(origin.coordinates.lng);
  const destLat = Number(destination.coordinates.lat);
  const destLng = Number(destination.coordinates.lng);

  if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
    console.error("Invalid coordinates:", { origin, destination });
    throw new HttpsError("invalid-argument", "Las coordenadas de origen o destino no son válidas.");
  }

  const requesterId = request.auth.uid;

  try {
    const userDoc = await db.collection('users').doc(requesterId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "No se encontró tu perfil de usuario para crear la solicitud.");
    }
    const userData = userDoc.data();

    const newRequestData = {
      requester: {
        id: requesterId,
        displayName: userData.displayName || 'Usuario',
        photoURL: userData.photoURL || null,
        gender: userData.gender || null  // Needed for women-only matching validation
      },
      origin: { address: origin.address, coordinates: { lat: originLat, lng: originLng } },
      destination: { address: destination.address, coordinates: { lat: destLat, lng: destLng } },
      dateTime: rideDateTime,
      seats: Number(seats),
      suggestedPrice: Number(suggestedPrice),
      details: details || '',
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    };

    const newRequestRef = await db.collection('rideRequests').add(newRequestData);

    // Buscar viajes compatibles y notificar a conductores
    let compatibleRides = [];
    try {
      compatibleRides = await findCompatibleRides(newRequestData);

      // Crear notificaciones para conductores de viajes compatibles
      const notificationPromises = compatibleRides.map(ride =>
        db.collection('notifications').add({
          userId: ride.driver.id,
          type: 'new_compatible_request',
          title: '🎯 Nueva solicitud compatible',
          message: `${userData.displayName} busca viaje de ${origin.address} a ${destination.address}`,
          data: {
            requestId: newRequestRef.id,
            rideId: ride.id,
            matchScore: ride.matchScore,
            requesterName: userData.displayName,
            route: `${origin.address} → ${destination.address}`
          },
          read: false,
          createdAt: FieldValue.serverTimestamp()
        })
      );

      await Promise.all(notificationPromises);
    } catch (matchError) {
      // No fallar la creación de solicitud si falla el matching
      console.error('Error en matching automático:', matchError);
    }

    return { success: true, requestId: newRequestRef.id, matchesFound: compatibleRides?.length || 0 };

  } catch (error) {
    console.error(`Error al crear la solicitud de viaje para ${requesterId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", `Error interno al crear solicitud: ${error.message}`);
  }
});

/**
 * Busca viajes compatibles con una solicitud
 */
async function findCompatibleRides(requestData) {
  try {
    const ridesSnapshot = await db.collection('rides')
      .where('status', '==', 'scheduled')
      .where('seatsAvailable', '>=', requestData.seats)
      .get();

    const compatible = [];

    for (const rideDoc of ridesSnapshot.docs) {
      const ride = { id: rideDoc.id, ...rideDoc.data() };

      // FIX Bug #15: Evitar auto-matching (conductor no puede matchear con su propia solicitud)
      if (ride.driver.id === requestData.requester.id) {
        continue;
      }

      // FIX Bug #14: Validar restricción de género para viajes women-only
      if (ride.isWomenOnly && requestData.requester.gender !== 'female') {
        continue;
      }

      // Verificar compatibilidad
      if (isCompatible(ride, requestData)) {
        const score = calculateMatchScore(ride, requestData);
        compatible.push({ ...ride, matchScore: score });
      }
    }

    // Ordenar por score descendente y retornar top 5
    return compatible
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

  } catch (error) {
    console.error('Error buscando viajes compatibles:', error);
    return [];
  }
}

exports.cancelRideRequest = onCall({ region: REGION, cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado.");

  const { requestId } = request.data;
  if (!requestId) throw new HttpsError("invalid-argument", "Falta el ID de la solicitud.");

  const currentUserId = request.auth.uid;
  const requestRef = db.collection('rideRequests').doc(requestId);

  try {
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) throw new HttpsError("not-found", "La solicitud ya no existe.");

    const requestData = requestDoc.data();
    if (requestData.requester?.id !== currentUserId) throw new HttpsError("permission-denied", "No tienes permiso para cancelar esta solicitud.");
    if (requestData.status !== 'pending') throw new HttpsError("failed-precondition", `No se puede cancelar una solicitud que ya está en estado '${requestData.status}'.`);

    await requestRef.delete();
    return { success: true, message: "Solicitud cancelada con éxito." };

  } catch (error) {
    console.error("Error al cancelar la solicitud:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "No se pudo cancelar la solicitud.");
  }
});

exports.acceptRequest = onCall({ region: REGION, cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado para aceptar una solicitud.");

  const { requestId } = request.data;
  if (!requestId) throw new HttpsError("invalid-argument", "Falta el ID de la solicitud a aceptar.");

  const driverId = request.auth.uid;
  const requestRef = db.collection('rideRequests').doc(requestId);
  const driverRef = db.collection('users').doc(driverId);

  try {
    return db.runTransaction(async (transaction) => {
      const [requestDoc, driverDoc] = await Promise.all([transaction.get(requestRef), transaction.get(driverRef)]);

      if (!requestDoc.exists) throw new HttpsError("not-found", "La solicitud de viaje ya no existe.");
      if (!driverDoc.exists) throw new HttpsError("not-found", "No se encontró tu perfil de conductor.");

      const requestData = requestDoc.data();
      const driverData = driverDoc.data();

      if (requestData.requester.id === driverId) throw new HttpsError("permission-denied", "No puedes aceptar tu propia solicitud de viaje.");
      if (requestData.status !== 'pending') throw new HttpsError("failed-precondition", "Esta solicitud ya ha sido aceptada o cancelada.");

      // --- FIX: Obtener y validar wallet del pasajero ---
      const passengerWalletRef = db.collection('wallets').doc(requestData.requester.id);
      const passengerWalletDoc = await transaction.get(passengerWalletRef);

      if (!passengerWalletDoc.exists) {
        throw new HttpsError("not-found", "El pasajero no tiene wallet. Debe crear una cuenta completa primero.");
      }

      const walletData = passengerWalletDoc.data();
      const price = requestData.suggestedPrice;

      // Validar balance suficiente
      if (walletData.balance < price) {
        throw new HttpsError("failed-precondition",
          `El pasajero no tiene saldo suficiente. Requiere ${price}€ pero solo tiene ${walletData.balance}€.`);
      }

      // Retener fondos del pasajero
      transaction.update(passengerWalletRef, {
        balance: admin.firestore.FieldValue.increment(-price),
        heldBalance: admin.firestore.FieldValue.increment(price)
      });
      // ------------------------------------------------

      // --- FIX: Ensure coordinates are plain objects ---
      const getCoords = (coords) => {
        if (coords instanceof admin.firestore.GeoPoint) {
          return { lat: coords.latitude, lng: coords.longitude };
        }
        return coords;
      };

      const originObj = {
        address: requestData.origin.address,
        coordinates: getCoords(requestData.origin.coordinates)
      };

      const destObj = {
        address: requestData.destination.address,
        coordinates: getCoords(requestData.destination.coordinates)
      };
      // ------------------------------------------------

      const ridePin = Math.floor(1000 + Math.random() * 9000).toString();
      const passenger = {
        id: requestData.requester.id,
        displayName: requestData.requester.displayName,
        photoURL: requestData.requester.photoURL,
        status: 'confirmed',
        pin: ridePin,
        pickupLocation: originObj  // FIX: Use normalized origin
      };

      const newRideData = {
        driver: { id: driverId, displayName: driverData.displayName, photoURL: driverData.photoURL },
        origin: originObj,
        destination: destObj,
        dateTime: requestData.dateTime,
        seatsTotal: requestData.seats,
        seatsAvailable: requestData.seats - 1,
        price: requestData.suggestedPrice,
        details: `Este viaje fue creado a partir de una solicitud. ${requestData.details || ''}`.trim(),
        passengers: [passenger],
        participantIds: [driverId, requestData.requester.id],
        status: 'scheduled',
        createdAt: FieldValue.serverTimestamp(),
        fromRequestId: requestId,
      };

      const newRideRef = db.collection('rides').doc();
      transaction.set(newRideRef, newRideData);
      transaction.update(requestRef, { status: 'accepted', acceptedBy: driverId, rideId: newRideRef.id });

      return { success: true, rideId: newRideRef.id };
    });
  } catch (error) {
    console.error(`Error al aceptar la solicitud ${requestId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ocurrió un error inesperado al aceptar la solicitud.");
  }
});
