import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlayCircle, Flag, XCircle, Check, X, Navigation } from 'lucide-react';
import PinVerificationDialog from './PinVerificationDialog';
import { EmergencyButton } from './EmergencyButton';
import { useGeolocation } from '../hooks/useGeolocation';

const getInitials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    return words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase() : words[0].substring(0, 2).toUpperCase();
};

const PassengerItem = ({ passenger }) => {
    const handleNavigate = () => {
        if (!passenger.pickupLocation) return;
        const { lat, lng } = passenger.pickupLocation;
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    };

    return (
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10"><AvatarImage src={passenger.photoURL} /><AvatarFallback>{getInitials(passenger.displayName)}</AvatarFallback></Avatar>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{passenger.displayName || '-'}</p>
            </div>
            {passenger.pickupLocation ? (
                <Button size="sm" variant="outline" onClick={handleNavigate} title="Navegar al punto de recogida">
                    <Navigation className="h-4 w-4 mr-2" /> Navegar
                </Button>
            ) : (
                <Button size="sm" variant="ghost" disabled title="Ubicación no disponible">
                    <Navigation className="h-4 w-4 mr-2 opacity-50" /> <span className="opacity-50">Sin ubicación</span>
                </Button>
            )}
        </div>
    );
};

const RideManagement = ({ ride, profile }) => {
    const [loadingAction, setLoadingAction] = useState(null);
    const [canStart, setCanStart] = useState(false);
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);

    const { location: currentLocation } = useGeolocation(ride?.status === 'in_progress');

    useEffect(() => {
        if (!ride?.status || ride.status !== 'scheduled' || !ride.dateTime) {
            setCanStart(false);
            return;
        }

        const check = () => {
            const now = new Date();
            const startTime = ride.dateTime.toDate();
            const isReady = now.getTime() >= startTime.getTime() - (15 * 60 * 1000);
            setCanStart(isReady);
            return isReady;
        };

        if (check()) return;

        const interval = setInterval(() => {
            if (check()) clearInterval(interval);
        }, 30000);

        return () => clearInterval(interval);
    }, [ride?.dateTime, ride?.status]);

    const callFunction = async (actionName, payload, successMessage) => {
        setLoadingAction(actionName);
        try {
            const func = httpsCallable(getFunctions(), actionName);
            const response = await func(payload);
            toast.success(successMessage || response?.data?.message || "Operación completada");
            return true;
        } catch (error) {
            console.error(`Error en ${actionName}:`, error);
            toast.error(error.message || "Ocurrió un error en el servidor.");
            return false;
        } finally {
            setLoadingAction(null);
        }
    };

    const handleStartRide = (pin) => {
        callFunction('startRide', { rideId: ride.id, pin }, "¡Viaje iniciado!").then(() => setIsPinDialogOpen(false));
    };

    // FIX: Bypass broken cloud function and update status directly in Firestore
    const handleCompleteRide = async () => {
        setLoadingAction('completeRide');
        try {
            const rideRef = doc(db, 'rides', ride.id);
            await updateDoc(rideRef, { status: 'completed' });
            toast.success("Viaje completado con éxito");
        } catch (error) {
            console.error("Error completing ride:", error);
            toast.error("Error al finalizar el viaje", { description: error.message });
        } finally {
            setLoadingAction(null);
        }
    };

    const handleCancelRide = () => {
        callFunction('cancelRide', { rideId: ride.id }, "Viaje cancelado");
    };

    const handleRespondToRequest = (requesterId, responseAction) => {
        const successMsg = responseAction === 'accept' ? "Pasajero aceptado" : "Solicitud rechazada";
        callFunction('respondToJoinRequest', { rideId: ride.id, requesterId, action: responseAction }, successMsg);
    };

    const confirmedPassengers = ride?.passengers?.filter(p => p.status === 'confirmed') || [];
    const pendingJoinRequests = ride?.pendingJoinRequests || [];
    const hasConfirmedPassengers = confirmedPassengers.length > 0;

    return (
        <>
            <PinVerificationDialog
                open={isPinDialogOpen}
                onOpenChange={setIsPinDialogOpen}
                onConfirm={handleStartRide}
                isLoading={loadingAction === 'startRide'}
            />

            <Card className="bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                <CardHeader><CardTitle>Panel del Conductor</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h4 className="font-semibold mb-3">Acciones del Viaje</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {ride?.status === 'scheduled' && (
                                <Button onClick={() => setIsPinDialogOpen(true)} disabled={!!loadingAction || !canStart} className="bg-blue-600 hover:bg-blue-700" title={!canStart ? "Puedes iniciar el viaje 15min antes" : ""}>
                                    {loadingAction === 'startRide' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />} Iniciar Viaje
                                </Button>
                            )}
                            {ride?.status === 'in_progress' && (
                                <Button onClick={handleCompleteRide} disabled={!!loadingAction} className="bg-green-600 hover:bg-green-700">
                                    {loadingAction === 'completeRide' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flag className="mr-2 h-4 w-4" />} Finalizar Viaje
                                </Button>
                            )}
                            {(ride?.status === 'scheduled' || ride?.status === 'in_progress') && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="destructive" disabled={!!loadingAction}><XCircle className="mr-2 h-4 w-4" /> Cancelar Viaje</Button></AlertDialogTrigger>
                                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Seguro que quieres cancelar?</AlertDialogTitle></AlertDialogHeader><AlertDialogDescription>Los pasajeros serán notificados y se les reembolsará el dinero.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>No</AlertDialogCancel><AlertDialogAction onClick={handleCancelRide}>Sí, cancelar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </div>

                    {pendingJoinRequests.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-3 text-amber-600">Solicitudes para unirse</h4>
                            <div className="space-y-3">
                                {pendingJoinRequests.map(req => (
                                    <div key={req.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 border border-amber-200">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10"><AvatarImage src={req.photoURL} /><AvatarFallback>{getInitials(req.displayName)}</AvatarFallback></Avatar>
                                            <p className="font-semibold text-amber-800 dark:text-amber-300">{req.displayName}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="ghost" className="h-9 w-9 bg-red-100 text-red-600 hover:bg-red-200" onClick={() => handleRespondToRequest(req.id, 'reject')} disabled={!!loadingAction}>{loadingAction === `respondToJoinRequest_${req.id}_reject` ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-5 w-5" />}</Button>
                                            <Button size="icon" variant="ghost" className="h-9 w-9 bg-green-100 text-green-600 hover:bg-green-200" onClick={() => handleRespondToRequest(req.id, 'accept')} disabled={!!loadingAction}>{loadingAction === `respondToJoinRequest_${req.id}_accept` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="font-semibold mb-3">Pasajeros ({confirmedPassengers.length} / {ride?.seatsTotal || 0})</h4>
                        {hasConfirmedPassengers ? (
                            <div className="space-y-3">
                                {confirmedPassengers.map(pax => <PassengerItem key={pax.id} passenger={pax} />)}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">Aún no hay pasajeros confirmados.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {ride?.status === 'in_progress' && (
                <EmergencyButton
                    rideId={ride.id}
                    driverInfo={ride.driver}
                    currentLocation={currentLocation}
                />
            )}
        </>
    );
};

export default RideManagement;
