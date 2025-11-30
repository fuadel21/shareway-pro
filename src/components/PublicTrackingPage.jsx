import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { db, app } from '../lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { Loader2, ShieldOff, Car } from 'lucide-react';

// Fix for default Leaflet icons in React - using CDN URLs instead of imports
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom car icon
const carIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/666/666201.png',
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

function PublicTrackingPage() {
    const { rideId } = useParams();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [ride, setRide] = useState(null);
    const [isValid, setIsValid] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!rideId || !token) {
            setError("Enlace de seguimiento inválido o incompleto.");
            setIsValid(false);
            setLoading(false);
            return;
        }

        const verifyToken = async () => {
            try {
                const functions = getFunctions(app, 'europe-west1');
                const verifyShareToken = httpsCallable(functions, 'verifyShareToken_v1_v2');
                const result = await verifyShareToken({ rideId, token });

                if (result.data.success) {
                    setIsValid(true);
                } else {
                    throw new Error(result.data.error || "Token inválido o expirado.");
                }
            } catch (err) {
                setError(err.message);
                setIsValid(false);
                setLoading(false);
            }
        };

        verifyToken();
    }, [rideId, token]);

    useEffect(() => {
        if (!isValid) return;

        const rideRef = doc(db, 'rides', rideId);
        const unsubscribe = onSnapshot(rideRef, (docSnap) => {
            if (docSnap.exists()) {
                const rideData = docSnap.data();
                if (rideData.status !== 'active') {
                    setError("Este viaje ya no está activo.");
                    setRide(null);
                } else {
                    setRide(rideData);
                }
            } else {
                setError("No se pudo encontrar el viaje.");
            }
            setLoading(false);
        }, (err) => {
            setError("Error al cargar la información del viaje.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isValid, rideId]);

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin mb-4" />
                <p>Cargando mapa...</p>
            </div>
        );
    }

    if (error || !isValid) {
        return (
            <div className="h-screen flex flex-col items-center justify-center text-center p-4">
                <ShieldOff className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold">Acceso Denegado</h2>
                <p className="text-muted-foreground mt-2">{error || "El enlace de seguimiento no es válido o ha expirado."}</p>
            </div>
        );
    }

    const position = ride?.driverLocation ? [ride.driverLocation.latitude, ride.driverLocation.longitude] : null;

    return (
        <div className="h-screen w-screen relative">
            <header className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
                <h1 className="text-center text-white text-2xl font-bold">Siguiendo el viaje a {ride?.destination || '...'}</h1>
            </header>
            {
                position ? (
                    <MapContainer
                        center={position}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={position} icon={carIcon} />
                        <MapUpdater center={position} />
                    </MapContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center">
                        <Loader2 className="h-12 w-12 animate-spin mb-4" />
                        <p>Esperando la ubicación del conductor...</p>
                    </div>
                )
            }
            <footer className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/50 to-transparent">
                <p className="text-center text-white text-sm">El viaje se está realizando de forma segura a través de nuestra app.</p>
            </footer>
        </div>
    );
}

export default PublicTrackingPage;
