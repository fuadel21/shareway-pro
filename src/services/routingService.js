/**
 * Service to fetch routes using OSRM (Open Source Routing Machine)
 * Free public API: http://router.project-osrm.org/
 */

export const getRoute = async (startCoords, endCoords) => {
    if (!startCoords || !endCoords) return null;

    try {
        // OSRM expects {lon},{lat}
        const start = `${startCoords.lng},${startCoords.lat}`;
        const end = `${endCoords.lng},${endCoords.lat}`;

        const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            throw new Error('No route found');
        }

        const route = data.routes[0];

        // Convert GeoJSON coordinates [lon, lat] to Leaflet [lat, lon]
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

        return {
            coordinates, // Array of [lat, lon]
            distance: route.distance, // in meters
            duration: route.duration, // in seconds
            bounds: [
                [Math.min(...coordinates.map(c => c[0])), Math.min(...coordinates.map(c => c[1]))],
                [Math.max(...coordinates.map(c => c[0])), Math.max(...coordinates.map(c => c[1]))]
            ]
        };
    } catch (error) {
        console.error("Error fetching route from OSRM:", error);
        // Fallback: just return a straight line
        return {
            coordinates: [
                [startCoords.lat, startCoords.lng],
                [endCoords.lat, endCoords.lng]
            ],
            distance: 0,
            duration: 0
        };
    }
};
