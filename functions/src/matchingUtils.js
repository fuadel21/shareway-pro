/**
 * Utilidades para el sistema de matching inteligente
 * Calcula compatibilidad entre viajes y solicitudes
 */

/**
 * Calcula la distancia entre dos coordenadas usando la fórmula de Haversine
 * @param {Object} coord1 - Primera coordenada {lat, lng}
 * @param {Object} coord2 - Segunda coordenada {lat, lng}
 * @returns {number} Distancia en kilómetros
 */
function calculateDistance(coord1, coord2) {
    const R = 6371; // Radio de la Tierra en km

    const toRad = (degrees) => degrees * (Math.PI / 180);

    const dLat = toRad(coord2.lat - coord1.lat);
    const dLon = toRad(coord2.lng - coord1.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Verifica si dos fechas son compatibles dentro de una ventana temporal
 * @param {Date} date1 - Primera fecha
 * @param {Date} date2 - Segunda fecha
 * @param {number} maxHoursDiff - Máxima diferencia en horas (default: 2)
 * @returns {boolean} True si son compatibles
 */
function isTimeCompatible(date1, date2, maxHoursDiff = 2) {
    const diffMs = Math.abs(date1.getTime() - date2.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours <= maxHoursDiff;
}

/**
 * Calcula un score de compatibilidad entre un viaje y una solicitud
 * @param {Object} ride - Datos del viaje
 * @param {Object} request - Datos de la solicitud
 * @returns {number} Score de 0-100, donde 100 es perfecta compatibilidad
 */
function calculateMatchScore(ride, request) {
    let score = 0;

    // Convertir GeoPoints a objetos con lat/lng si es necesario
    const rideOrigin = ride.origin.coordinates._latitude
        ? { lat: ride.origin.coordinates._latitude, lng: ride.origin.coordinates._longitude }
        : ride.origin.coordinates;

    const rideDestination = ride.destination.coordinates._latitude
        ? { lat: ride.destination.coordinates._latitude, lng: ride.destination.coordinates._longitude }
        : ride.destination.coordinates;

    const requestOrigin = request.origin.coordinates._latitude
        ? { lat: request.origin.coordinates._latitude, lng: request.origin.coordinates._longitude }
        : request.origin.coordinates;

    const requestDestination = request.destination.coordinates._latitude
        ? { lat: request.destination.coordinates._latitude, lng: request.destination.coordinates._longitude }
        : request.destination.coordinates;

    // 1. Proximidad de origen (40 puntos máximo)
    const originDistance = calculateDistance(rideOrigin, requestOrigin);
    if (originDistance <= 1) score += 40;
    else if (originDistance <= 3) score += 30;
    else if (originDistance <= 5) score += 20;
    else if (originDistance <= 10) score += 10;

    // 2. Proximidad de destino (40 puntos máximo)
    const destinationDistance = calculateDistance(rideDestination, requestDestination);
    if (destinationDistance <= 1) score += 40;
    else if (destinationDistance <= 3) score += 30;
    else if (destinationDistance <= 5) score += 20;
    else if (destinationDistance <= 10) score += 10;

    // 3. Compatibilidad temporal (15 puntos máximo)
    const rideDate = ride.dateTime.toDate ? ride.dateTime.toDate() : new Date(ride.dateTime);
    const requestDate = request.dateTime.toDate ? request.dateTime.toDate() : new Date(request.dateTime);

    const timeDiffHours = Math.abs(rideDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60);
    if (timeDiffHours <= 0.5) score += 15;
    else if (timeDiffHours <= 1) score += 10;
    else if (timeDiffHours <= 2) score += 5;

    // 4. Precio razonable (5 puntos)
    if (ride.price <= request.suggestedPrice * 1.2) score += 5;
    else if (ride.price <= request.suggestedPrice * 1.5) score += 3;

    return Math.round(score);
}

/**
 * Verifica si un viaje es compatible con una solicitud
 * @param {Object} ride - Datos del viaje
 * @param {Object} request - Datos de la solicitud
 * @returns {boolean} True si son compatibles
 */
function isCompatible(ride, request) {
    // 1. Verificar asientos disponibles
    if (ride.seatsAvailable < request.seats) return false;

    // 2. Verificar estado del viaje
    if (ride.status !== 'scheduled') return false;

    // 3. Calcular score y verificar umbral mínimo
    const score = calculateMatchScore(ride, request);
    return score >= 60; // Umbral mínimo de compatibilidad
}

module.exports = {
    calculateDistance,
    isTimeCompatible,
    calculateMatchScore,
    isCompatible
};
