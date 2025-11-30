import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

// Fix for default Leaflet icons in React - using CDN URLs instead of imports
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom car icon
const carIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3774/3774270.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

// Component to update map center
const MapUpdater = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.panTo(center);
        }
    }, [center, map]);
    return null;
};

const LiveTrackingMap = ({ ride, initialPosition }) => {
    const [driverLocation, setDriverLocation] = useState(initialPosition ? { lat: initialPosition.lat, lng: initialPosition.lng, heading: 0 } : null);
    const watchIdRef = useRef(null);

    useEffect(() => {
        let lastKnownHeading = driverLocation?.heading || 0;

        const updateLocationInDb = async (lat, lng, heading) => {
            const rideRef = doc(db, 'rides', ride.id);
            try {
                await updateDoc(rideRef, {
                    driverLocation: { latitude: lat, longitude: lng, heading: heading || 0 }
                });
            } catch (error) {
                console.error("Error actualizando la ubicación en Firestore: ", error);
            }
        };

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, heading } = position.coords;
                lastKnownHeading = heading ?? lastKnownHeading;
                const newLocation = { lat: latitude, lng: longitude, heading: lastKnownHeading };

                setDriverLocation(newLocation);
                updateLocationInDb(latitude, longitude, lastKnownHeading);
            },
            (error) => {
                console.error("Error watching position: ", error);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );

        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [ride.id]);

    if (!driverLocation) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-200">
                <p>Esperando ubicación del conductor...</p>
            </div>
        );
    }

    return (
        <MapContainer
            center={[driverLocation.lat, driverLocation.lng]}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker
                position={[driverLocation.lat, driverLocation.lng]}
                icon={carIcon}
            />
            <MapUpdater center={[driverLocation.lat, driverLocation.lng]} />
        </MapContainer>
    );
};

export default LiveTrackingMap;
