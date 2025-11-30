
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Loader2, Send, ArrowLeft } from 'lucide-react';

const LoadingSkeleton = () => (
    <div className="container mx-auto p-4 max-w-2xl pb-24 space-y-4">
        <Skeleton className="h-10 w-32" />
        <Card>
            <CardHeader><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
            <CardContent className="space-y-4 pt-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-12 w-full" />
            </CardContent>
        </Card>
        <div className="flex justify-end"><Skeleton className="h-12 w-48" /></div>
    </div>
);

const RequestRide = () => {
    const { rideId } = useParams();
    const navigate = useNavigate();
    const { profile: currentUserProfile } = useOutletContext();

    const [ride, setRide] = useState(null);
    const [driver, setDriver] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!rideId) {
            navigate('/dashboard');
            return;
        }

        const rideRef = doc(db, 'rides', rideId);

        const unsubscribeRide = onSnapshot(rideRef, (rideSnap) => {
            if (!rideSnap.exists()) {
                toast.error("El viaje ya no está disponible.");
                navigate('/dashboard', { replace: true });
                return;
            }

            const rideData = { id: rideSnap.id, ...rideSnap.data() };
            setRide(rideData);

            if (rideData.driver?.id) {
                const driverRef = doc(db, 'users', rideData.driver.id);
                onSnapshot(driverRef, (driverSnap) => {
                    if (driverSnap.exists()) {
                        setDriver(driverSnap.data());
                    } else {
                        setDriver(null);
                        toast.error("No se pudo encontrar la información del conductor. No puedes solicitar este viaje.");
                    }
                    setLoading(false);
                });
            } else {
                setDriver(null);
                setLoading(false);
                toast.error("Este viaje no tiene conductor asignado y no se puede solicitar.");
            }
        }, (error) => {
            console.error("Error al obtener el viaje:", error);
            toast.error("No se pudo cargar la información del viaje.");
            navigate('/dashboard');
        });

        return () => {
            unsubscribeRide();
        };
    }, [rideId, navigate]);

    const handleConfirmRequest = async () => {
        if (!currentUserProfile) {
            toast.error("Tu perfil no está disponible. Inténtalo de nuevo.");
            return;
        }
        if (!driver) {
            toast.error("No se puede enviar la solicitud porque no se ha podido cargar el conductor.");
            return;
        }
        setIsSubmitting(true);
        const toastId = toast.loading("Enviando tu solicitud...");

        try {
            const requestToJoinRide = httpsCallable(functions, 'requestToJoinRide_v2');
            const result = await requestToJoinRide({ rideId });

            if (result.data.success) {
                toast.success("¡Solicitud enviada!", {
                    id: toastId,
                    description: "Recibirás una notificación cuando el conductor la acepte.",
                });
                navigate('/dashboard', { replace: true });
            }
        } catch (error) {
            console.error("Error al enviar la solicitud:", error);
            toast.error("Error al enviar la solicitud", {
                id: toastId,
                description: error.message || "Ocurrió un error inesperado.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <LoadingSkeleton />;
    }

    const isRequestDisabled = isSubmitting || !driver || !ride;

    return (
        <div className="min-h-screen bg-gray-50">
             <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto p-4 flex items-center gap-4 max-w-2xl">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft /></Button>
                    <h1 className="text-xl font-bold">Confirmar Solicitud</h1>
                </div>
            </header>
            <main className="container mx-auto p-4 max-w-2xl pb-24">
                <Card>
                    <CardHeader>
                        <CardTitle>Revisa los detalles del viaje</CardTitle>
                        <CardDescription>Estás a punto de solicitar una plaza. El conductor recibirá tu petición al instante.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        {ride && (
                            <div className="p-4 border rounded-lg bg-white">
                                <p className="font-bold text-lg">{`${ride.origin?.address?.split(',')[0]} → ${ride.destination?.address?.split(',')[0]}`}</p>
                                <div className="flex items-center gap-6 mt-2 text-md text-gray-600">
                                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {ride.dateTime?.toDate() ? format(ride.dateTime.toDate(), 'PPP', { locale: es }) : '-'}</div>
                                    <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> {ride.dateTime?.toDate() ? format(ride.dateTime.toDate(), 'p', { locale: es }) : '-'}</div>
                                </div>
                            </div>
                        )}

                        {driver && (
                             <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium">Conductor</p>
                                    <p className="font-semibold text-lg">{driver.name}</p>
                                </div>
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={driver.photoURL} />
                                    <AvatarFallback>{driver.name?.charAt(0) || 'D'}</AvatarFallback>
                                </Avatar>
                            </div>
                        )}

                        {ride && (
                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center">
                                    <p className="text-lg font-semibold">Precio por plaza:</p>
                                    <p className="text-2xl font-bold">{ride.price > 0 ? `${ride.price.toFixed(2)}€` : 'Gratis'}</p>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Se te cobrará solo cuando el conductor acepte y tú confirmes el pago.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <div className="mt-6 flex justify-end">
                    <Button size="lg" onClick={handleConfirmRequest} disabled={isRequestDisabled}>
                        {isSubmitting ?
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> :
                            <><Send className="mr-2 h-4 w-4" /> Confirmar y Enviar Solicitud</>}
                    </Button>
                </div>
                {isRequestDisabled && !isSubmitting && (
                    <p className="text-center text-sm text-red-500 mt-4">
                        No puedes enviar una solicitud porque la información del viaje o del conductor no está completa.
                    </p>
                )}
            </main>
        </div>
    );
};

export default RequestRide;
