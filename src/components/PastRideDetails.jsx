import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
// import { GoogleMap, Polyline } from '@react-google-maps/api';
import RideRouteMap from './RideRouteMap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

import SubPageHeader from './SubPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Loader2, BadgeCheck, AlertTriangle, User, Calendar, MapPin, Milestone, Wallet } from 'lucide-react';

// const mapContainerStyle = { width: '100%', height: '250px' };
// const mapOptions = { disableDefaultUI: true, zoomControl: true };

const PastRideDetails = () => {
    const { id: rideId } = useParams();
    const navigate = useNavigate();
    const [ride, setRide] = useState(null);
    const [decodedPath, setDecodedPath] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!rideId) {
            navigate('/');
            return;
        }

        const rideRef = doc(db, 'rides', rideId);
        getDoc(rideRef).then(docSnap => {
            if (docSnap.exists()) {
                const rideData = { id: docSnap.id, ...docSnap.data() };
                setRide(rideData);
                // if (rideData.overview_polyline && window.google?.maps?.geometry?.encoding) {
                //     try {
                //         setDecodedPath(window.google.maps.geometry.encoding.decodePath(rideData.overview_polyline));
                //     } catch (e) { console.error("Error decoding polyline:", e); }
                // }
            } else {
                toast.error("Este viaje no existe.");
                navigate('/my-rides');
            }
            setLoading(false);
        }).catch(error => {
            console.error("Error fetching past ride:", error);
            toast.error("No se pudo cargar el viaje.");
            navigate('/my-rides');
        });

    }, [rideId, navigate]);

    if (loading) {
        return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Cargando...</div>;
    }

    if (!ride) {
        return <div className="h-screen flex items-center justify-center">No se encontró el viaje.</div>;
    }

    const formattedDate = ride.dateTime?.toDate ? format(ride.dateTime.toDate(), "eeee, dd MMMM yyyy", { locale: es }) : '';
    const formattedTime = ride.dateTime?.toDate ? format(ride.dateTime.toDate(), "HH:mm", { locale: es }) : '';

    return (
        <div className="bg-slate-50 min-h-screen">
            <SubPageHeader title="Detalle de Viaje Pasado" />
            <main className="container max-w-3xl mx-auto p-4 space-y-6">
                <Card className="text-center">
                    <CardHeader>
                        {ride.status === 'completed' ?
                            <BadgeCheck className="mx-auto h-16 w-16 text-green-500 mb-4" /> :
                            <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
                        }
                        <CardTitle className="text-2xl">Viaje {ride.status === 'completed' ? 'Completado' : 'Cancelado'}</CardTitle>
                        <CardDescription>{formattedDate} a las {formattedTime}</CardDescription>
                    </CardHeader>
                </Card>

                <Card>
                    <CardContent className="p-0 h-[250px]">
                        <RideRouteMap
                            origin={ride.origin?.coordinates}
                            destination={ride.destination?.coordinates}
                            status={ride.status}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Resumen del Viaje</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-base">
                        <div className="flex items-center gap-3"><MapPin className="h-6 w-6 text-primary" /><p><b>Origen:</b><br /> {ride.origin.address}</p></div>
                        <div className="flex items-center gap-3"><Milestone className="h-6 w-6 text-primary" /><p><b>Destino:</b><br /> {ride.destination.address}</p></div>
                        <div className="flex items-center gap-3"><User className="h-6 w-6 text-primary" /><p><b>Conductor:</b><br /> {ride.driver.displayName}</p></div>
                        <div className="flex items-center gap-3"><Wallet className="h-6 w-6 text-primary" /><p><b>Precio Final:</b><br /> {ride.price.toFixed(2)}€</p></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Pasajeros</CardTitle></CardHeader>
                    <CardContent>
                        {ride.passengers && ride.passengers.length > 0 ? (
                            <ul className="list-disc list-inside">
                                {ride.passengers.map(p => <li key={p.id}>{p.displayName}</li>)}
                            </ul>
                        ) : (
                            <p>No hubo pasajeros en este viaje.</p>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default PastRideDetails;
