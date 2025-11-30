import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link, useOutletContext } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

// Componentes
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import RideRouteMap from './RideRouteMap';
import CallButton from './CallButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Iconos y Utils
import { Calendar, Clock, Users, ArrowLeft, Loader2, Handshake, MessageSquare, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getOrCreateChat } from '../services/chatService';

const toLatLng = (geoPoint) => {
    if (geoPoint?.latitude && geoPoint?.longitude) {
        return { lat: geoPoint.latitude, lng: geoPoint.longitude };
    }
    return null;
};

function RequestDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile: currentUserProfile, user } = useOutletContext();

    const [request, setRequest] = useState(null);
    const [requesterProfile, setRequesterProfile] = useState(null); // Perfil completo para datos como el teléfono
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAcceptDialog, setShowAcceptDialog] = useState(false);
    const [price, setPrice] = useState('');

    const functions = getFunctions();
    const cancelRideRequest = httpsCallable(functions, 'cancelRideRequest');
    const acceptRequestFunction = httpsCallable(functions, 'acceptRequest'); // Asumiendo que esta es la función correcta

    useEffect(() => {
        const requestDocRef = doc(db, 'rideRequests', id);
        const unsubscribe = onSnapshot(requestDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setRequest({ id: docSnap.id, ...docSnap.data() });
            } else {
                toast.error("Solicitud no encontrada.");
                navigate('/dashboard', { replace: true });
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [id, navigate]);

    useEffect(() => {
        if (request?.requesterId) {
            const fetchUserProfile = async () => {
                const userDoc = await getDoc(doc(db, "users", request.requesterId));
                if (userDoc.exists()) {
                    setRequesterProfile(userDoc.data());
                }
            };
            fetchUserProfile();
        }
    }, [request]);

    const handleAcceptRequest = () => setShowAcceptDialog(true);

    const handleCancelRequest = async () => {
        setIsSubmitting(true);
        try {
            await cancelRideRequest({ requestId: id });
            toast.success("Solicitud cancelada");
            navigate('/dashboard', { replace: true });
        } catch (error) {
            toast.error("Error al cancelar", { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContactRequester = async () => {
        if (!request?.requesterId) return;
        setIsSubmitting(true);
        try {
            const chatId = await getOrCreateChat(currentUserProfile.uid, request.requesterId);
            navigate(`/chat/${chatId}`);
        } catch (error) {
            toast.error("Error al iniciar el chat", { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };



    const handleConfirmAcceptance = async () => {
        const numericPrice = Number(price);
        if (isNaN(numericPrice) || numericPrice <= 0) return toast.error("Por favor, introduce un precio válido.");
        setIsSubmitting(true);
        try {
            const result = await acceptRequestFunction({ requestId: id, price: numericPrice });
            const { rideId } = result.data;
            toast.success("¡Contraoferta enviada!", { description: "El viaje se ha creado y el pasajero debe confirmar el precio." });
            navigate(`/ride/${rideId}`);
        } catch (error) {
            toast.error("Error al aceptar la solicitud", { description: error.message });
        } finally {
            setIsSubmitting(false);
            setShowAcceptDialog(false);
        }
    };

    if (loading || !currentUserProfile) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!request) return null;

    const isRequester = currentUserProfile.uid === request.requesterId;
    const canAccept = !isRequester;
    const canContact = !isRequester && requesterProfile;

    const originLatLng = toLatLng(request.origin?.coordinates);
    const destinationLatLng = toLatLng(request.destination?.coordinates);

    return (
        <>
            <div className="max-w-4xl mx-auto p-4">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
                <Card>
                    <div className="h-64 bg-gray-200">
                        {originLatLng && destinationLatLng ? <RideRouteMap origin={originLatLng} destination={destinationLatLng} status="scheduled" /> : <div className="h-full flex items-center justify-center">Cargando mapa...</div>}
                    </div>
                    <CardHeader>
                        <CardTitle className="text-2xl">Detalles de la Solicitud</CardTitle>
                        <p className="text-gray-500">De {request.origin?.address} a {request.destination?.address}</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {request.dateTime && <div className="flex items-center"><Calendar className="mr-2 h-5 w-5 text-gray-600" /><span>{format(request.dateTime.toDate(), "eeee, d 'de' LLLL")}</span></div>}
                            {request.dateTime && <div className="flex items-center"><Clock className="mr-2 h-5 w-5 text-gray-600" /><span>{format(request.dateTime.toDate(), "p", { locale: es })}</span></div>}
                        </div>
                        {requesterProfile && (
                            <div>
                                <h3 className="font-semibold mb-2">Solicitante</h3>
                                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100">
                                    <Link to={`/profile/${request.requesterId}`} className="flex items-center gap-3">
                                        <Avatar><AvatarImage src={requesterProfile.photoURL} /><AvatarFallback>{requesterProfile.name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                                        <span className="font-medium">{requesterProfile.name}</span>
                                    </Link>
                                    {canContact && (
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="icon" onClick={handleContactRequester} disabled={isSubmitting}><MessageSquare className="h-5 w-5" /></Button>
                                            <CallButton
                                                recipientId={request.requesterId}
                                                recipientName={requesterProfile.name}
                                                recipientPhoto={requesterProfile.photoURL}
                                                className="h-10 w-10"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div>
                            <h3 className="font-semibold mb-2">Plazas Solicitadas</h3>
                            <div className="flex items-center gap-2"><Users className="h-5 w-5 text-muted-foreground" /><span>{request.seats} plaza(s)</span></div>
                        </div>
                        <div className="border-t pt-4 flex justify-end items-center">
                            {canAccept && (
                                <Button size="lg" onClick={handleAcceptRequest} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Handshake className="mr-2 h-5 w-5" />}
                                    Aceptar Solicitud
                                </Button>
                            )}
                            {isRequester && (
                                <Button variant="destructive" size="lg" onClick={handleCancelRequest} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <XCircle className="mr-2 h-5 w-5" />}
                                    Cancelar Solicitud
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Aceptar y Proponer Precio</DialogTitle>
                        <DialogDescription>Estás a punto de aceptar este viaje. Por favor, establece el precio final por asiento. El pasajero original deberá confirmarlo.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="price">Precio por asiento (€)</Label>
                        <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ej: 15.50" className="mt-2" min="1" step="0.5" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>Cancelar</Button>
                        <Button onClick={handleConfirmAcceptance} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                            Confirmar y Crear Viaje
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default RequestDetails;
