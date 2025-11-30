import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Clock, Car, User } from 'lucide-react';
import RideRouteMap from './RideRouteMap';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

export default function PublicTracking() {
    const { token } = useParams();
    const [ride, setRide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRide = async () => {
            try {
                const functions = getFunctions();
                const getPublicRideDetails = httpsCallable(functions, 'getPublicRideDetails');
                const result = await getPublicRideDetails({ shareToken: token });
                setRide(result.data);
            } catch (err) {
                console.error("Error fetching ride:", err);
                setError("No se pudo cargar el viaje. El enlace puede haber expirado.");
            } finally {
                setLoading(false);
            }
        };

        fetchRide();

        // Poll every 30 seconds for updates
        const interval = setInterval(fetchRide, 30000);
        return () => clearInterval(interval);
    }, [token]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardContent className="pt-6">
                        <p className="text-red-500 mb-4">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-primary">Taxi Compartido</h1>
                    <p className="text-muted-foreground">Seguimiento de viaje en tiempo real</p>
                </header>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Ride Info */}
                    <Card className="md:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle className="text-lg">Detalles del Viaje</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Driver */}
                            <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={ride.driver.photoURL} />
                                    <AvatarFallback>{getInitials(ride.driver.displayName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{ride.driver.displayName}</p>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Car className="h-3 w-3 mr-1" />
                                        {ride.driver.vehicle?.make} {ride.driver.vehicle?.model} • {ride.driver.vehicle?.color}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4 space-y-4">
                                <div className="flex gap-3">
                                    <div className="flex flex-col items-center pt-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <div className="w-0.5 flex-1 bg-gray-200 my-1" />
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                    </div>
                                    <div className="space-y-4 flex-1">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Origen</p>
                                            <p className="text-sm font-medium">{ride.origin.address}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Destino</p>
                                            <p className="text-sm font-medium">{ride.destination.address}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <Badge variant={ride.status === 'in_progress' ? 'default' : 'secondary'}>
                                    {ride.status === 'in_progress' ? 'En Curso' :
                                        ride.status === 'completed' ? 'Completado' :
                                            ride.status === 'scheduled' ? 'Programado' : ride.status}
                                </Badge>
                                <div className="text-sm text-muted-foreground flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {ride.duration}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Map */}
                    <Card className="md:col-span-2 overflow-hidden h-[500px]">
                        <CardContent className="p-0 h-full relative">
                            <RideRouteMap
                                origin={ride.origin?.coordinates}
                                destination={ride.destination?.coordinates}
                                status={ride.status}
                            />
                            {/* Overlay for status if needed */}
                            {ride.status === 'completed' && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                    <div className="bg-white p-6 rounded-lg text-center">
                                        <h3 className="text-xl font-bold mb-2">¡Viaje Completado!</h3>
                                        <p className="text-muted-foreground">El conductor ha llegado a su destino.</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
