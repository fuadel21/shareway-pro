import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icons in React - using CDN URLs instead of imports
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const defaultCenter = [40.416775, -3.703790]; // Madrid

const toLatLng = (geoPoint) => {
    if (geoPoint && typeof geoPoint.latitude === 'number' && typeof geoPoint.longitude === 'number') {
        return [geoPoint.latitude, geoPoint.longitude];
    }
    // Also handle {lat, lng} format
    if (geoPoint && typeof geoPoint.lat === 'number' && typeof geoPoint.lng === 'number') {
        return [geoPoint.lat, geoPoint.lng];
    }
    return null;
};

const MapComponent = ({ userLocation, itemsToDisplay = [] }) => {
    const center = userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter;

    return (
        <MapContainer
            center={center}
            zoom={6}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]}>
                    <Popup>Tu ubicación</Popup>
                </Marker>
            )}

            {itemsToDisplay.map(item => {
                const originLatLng = toLatLng(item.originCoords);
                const destinationLatLng = toLatLng(item.destinationCoords);

                if (item.type === 'ride') {
                    const isRideActive = item.status === 'active';
                    const currentLocationLatLng = toLatLng(item.currentLocation);
                    const markerPosition = isRideActive && currentLocationLatLng ? currentLocationLatLng : originLatLng;

                    return (
                        <React.Fragment key={`ride-${item.id}`}>
                            {markerPosition && (
                                <Marker position={markerPosition}>
                                    <Popup>
                                        {isRideActive ? 'Viaje en curso' : 'Viaje programado'}
                                    </Popup>
                                </Marker>
                            )}
                            {originLatLng && destinationLatLng && (
                                <Polyline
                                    positions={[originLatLng, destinationLatLng]}
                                    color={isRideActive ? '#1e8e3e' : '#1a73e8'}
                                    weight={isRideActive ? 6 : 4}
                                    opacity={0.8}
                                />
                            )}
                        </React.Fragment>
                    );
                } else if (item.type === 'request') {
                    return (
                        <React.Fragment key={`request-${item.id}`}>
                            {originLatLng && (
                                <Marker position={originLatLng}>
                                    <Popup>Solicitud desde {item.origin?.address || 'ubicación'}</Popup>
                                </Marker>
                            )}
                            {destinationLatLng && (
                                <Marker position={destinationLatLng}>
                                    <Popup>Solicitud hacia {item.destination?.address || 'destino'}</Popup>
                                </Marker>
                            )}
                        </React.Fragment>
                    );
                }
                return null;
            })}
        </MapContainer>
    );
};

export default MapComponent;
