import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useOutletContext } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, runTransaction, arrayUnion, arrayRemove, serverTimestamp, collection } from 'firebase/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import SubPageHeader from './SubPageHeader';
import RideManagement from './RideManagement.jsx';
import RideRouteMap from './RideRouteMap.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, UserX, Armchair, Calendar, MapPin, Milestone, CheckCircle, Wallet, MessageSquare, Clock, AlertTriangle, CreditCard, Navigation } from 'lucide-react';

const toSafeDate = (date) => {
    if (!date) return null;
    if (date.toDate && typeof date.toDate === 'function') return date.toDate();
    const d = new Date(date);
    if (!isNaN(d.getTime())) return d;
    return null;
};

const getInitials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    return words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase() : words[0].substring(0, 2).toUpperCase();
};

const generatePin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

function RideDetails() {
    const { id: rideId } = useParams();
    const navigate = useNavigate();
    const { user, profile, mapsLoaded } = useOutletContext();

    const [ride, setRide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isBooking, setIsBooking] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isContacting, setIsContacting] = useState(false);

    useEffect(() => {
        if (!rideId || !user) return;
        const rideRef = doc(db, 'rides', rideId);
        const unsubscribe = onSnapshot(rideRef, (doc) => {
            if (doc.exists()) {
                setRide({ id: doc.id, ...doc.data() });
            } else {
                toast.error("Este viaje ya no existe.");
                navigate('/my-rides');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [rideId, user, navigate]);

    const handleBookSeat = async () => {
        if (!user || !profile) return toast.error("Debes iniciar sesión para reservar.");

        setIsBooking(true);
        const toastId = toast.loading("Procesando reserva...");

        try {
            const rideRef = doc(db, 'rides', rideId);
            const userRef = doc(db, 'users', user.uid);

            await runTransaction(db, async (transaction) => {
                const [rideDoc, userDoc] = await Promise.all([transaction.get(rideRef), transaction.get(userRef)]);
                if (!rideDoc.exists()) throw new Error("El viaje ya no existe.");
                if (!userDoc.exists()) throw new Error("No se pudo encontrar tu perfil de usuario.");

                const rideData = rideDoc.data();
                const userData = userDoc.data();

                if (rideData.seatsAvailable <= 0) throw new Error("No hay asientos disponibles.");
                if (rideData.passengerUids?.includes(user.uid)) throw new Error("Ya tienes una plaza en este viaje.");
                if (rideData.driver.id === user.uid) throw new Error("No puedes reservar en tu propio viaje.");

                const ridePrice = rideData.price || 0;
                if (ridePrice > 0) {
                    const userWallet = userData.walletBalance || 0;
                    if (userWallet < ridePrice) throw new Error(`Saldo insuficiente. Necesitas ${ridePrice.toFixed(2)}€.`);
                    transaction.update(userRef, { walletBalance: userWallet - ridePrice });
                }

                const newPassenger = { id: user.uid, displayName: profile.displayName, photoURL: profile.photoURL || null, status: 'confirmed', pin: generatePin() };
                transaction.update(rideRef, { seatsAvailable: rideData.seatsAvailable - 1, passengers: arrayUnion(newPassenger), passengerUids: arrayUnion(user.uid) });
            });

            toast.success("¡Plaza confirmada y pagada con éxito!", { id: toastId });
        } catch (error) {
            console.error("Booking transaction error:", error);
            toast.error("Error al reservar", { id: toastId, description: error.message });
        } finally {
            setIsBooking(false);
        }
    };

    const handleCancelBooking = async () => {
        if (!user || !ride) return;
        
        setIsCancelling(true);
        const toastId = toast.loading("Cancelando tu reserva...");

        try {
            const rideRef = doc(db, 'rides', rideId);
            const userRef = doc(db, 'users', user.uid);

            await runTransaction(db, async (transaction) => {
                const [rideDoc, userDoc] = await Promise.all([transaction.get(rideRef), transaction.get(userRef)]);
                if (!rideDoc.exists()) throw new Error("El viaje ya no existe.");
                if (!userDoc.exists()) throw new Error("No se pudo encontrar tu perfil.");

                const rideData = rideDoc.data();
                const userData = userDoc.data();
                const passengerToRemove = rideData.passengers?.find(p => p.id === user.uid);

                if (!passengerToRemove) throw new Error("No se encontró tu reserva en este viaje.");

                const ridePrice = rideData.price || 0;
                if (ridePrice > 0) {
                    const userWallet = userData.walletBalance || 0;
                    transaction.update(userRef, { walletBalance: userWallet + ridePrice });
                }

                transaction.update(rideRef, {
                    seatsAvailable: rideData.seatsAvailable + 1,
                    passengers: arrayRemove(passengerToRemove),
                    passengerUids: arrayRemove(user.uid),
                });
            });

            toast.success("Reserva cancelada y reembolsada.", { id: toastId });
        } catch (error) {
            console.error("Cancellation transaction error:", error);
            toast.error("Error al cancelar", { id: toastId, description: error.message });
        } finally {
            setIsCancelling(false);
        }
    };

    const handleContactDriver = async () => {
        if (!ride.driver?.id) return;
        setIsContacting(true);
        try {
            const getOrCreateChat = httpsCallable(getFunctions(), 'getOrCreateChat');
            const { data } = await getOrCreateChat({ otherUserId: ride.driver.id });
            navigate(`/chat/${data.chatId}`);
        } catch (error) {
            toast.error("Error al iniciar el chat", { description: error.message });
        } finally {
            setIsContacting(false);
        }
    };

    if (loading || !ride) {
        return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    const isDriver = ride.driver?.id === user?.uid;
    const passengerInfo = ride.passengers?.find(p => p.id === user?.uid);
    const priceText = (typeof ride.price === 'number' && ride.price > 0) ? `${ride.price.toFixed(2)}€` : 'Gratis';
    const isProcessing = isBooking || isCancelling || isContacting;
    const canBook = !isDriver && !passengerInfo && ride.status === 'scheduled' && ride.seatsAvailable > 0;
    const rideDate = toSafeDate(ride.dateTime);

    return (
        <div className="bg-slate-50 min-h-screen pb-24">
            <SubPageHeader title="Detalles del Viaje" />
            <main className="container max-w-3xl mx-auto p-4 space-y-6">
                <Card><CardContent className="p-0 h-64"><RideRouteMap mapsLoaded={mapsLoaded} origin={ride.origin?.coordinates} destination={ride.destination?.coordinates} /></CardContent></Card>

                <Card>
                    <CardHeader><CardTitle>Información Clave</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-base">
                        <div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-gray-600" /><p><b>Fecha:</b><br /> {rideDate ? format(rideDate, "eeee, dd MMMM", { locale: es }) : 'N/A'}</p></div>
                        <div className="flex items-center gap-3"><Clock className="h-5 w-5 text-gray-600" /><p><b>Hora:</b><br /> {rideDate ? format(rideDate, "HH:mm", { locale: es }) : 'N/A'} h</p></div>
                        <div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-gray-600" /><p><b>Origen:</b><br /> {ride.origin?.address}</p></div>
                        <div className="flex items-center gap-3"><Milestone className="h-5 w-5 text-gray-600" /><p><b>Destino:</b><br /> {ride.destination?.address}</p></div>
                        <div className="flex items-center gap-3"><Armchair className="h-5 w-5 text-gray-600" /><p><b>Asientos:</b><br /> {ride.seatsAvailable} de {ride.seatsTotal}</p></div>
                        <div className="flex items-center gap-3"><Wallet className="h-5 w-5 text-gray-600" /><p><b>Precio:</b><br /> {priceText} / asiento</p></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Tu Estado en el Viaje</CardTitle></CardHeader>
                    <CardContent>
                        {isDriver ? <RideManagement ride={ride} profile={profile} /> : passengerInfo ? (
                            <div className="text-center">
                                <div className="text-green-600 font-semibold p-4 bg-green-100 rounded-lg mb-6"><CheckCircle className="inline-block mr-2" />¡Plaza confirmada!</div>
                                {passengerInfo.pin && <div className="p-4 border-2 border-dashed rounded-lg"><p className="text-sm text-muted-foreground">Tu PIN de Viaje</p><p className="text-4xl font-bold tracking-widest">{passengerInfo.pin}</p></div>}
                                <Separator className="my-6" />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="destructive" disabled={isProcessing}>{isCancelling ? <><Loader2 className="animate-spin h-4 w-4 mr-2"/>Cancelando...</> : <><UserX className="mr-2 h-4 w-4"/>Cancelar Reserva</>}</Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>¿Seguro?</AlertDialogTitle><AlertDialogDescription>Se te reembolsará el importe a tu cartera. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isCancelling}>No</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleCancelBooking} disabled={isCancelling}>{isCancelling ? <><Loader2 className="animate-spin h-4 w-4 mr-2"/>Confirmando...</> : "Sí, cancelar"}</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        ) : canBook ? (
                            <div className='text-center'>
                                <p className='mb-4 text-muted-foreground'>Confirma tu plaza para unirte al viaje.</p>
                                <Button size="lg" className="w-full font-bold bg-green-600 hover:bg-green-700" onClick={handleBookSeat} disabled={isProcessing}>{isBooking ? <Loader2 className="animate-spin"/> : <><CreditCard className="mr-2"/>Confirmar Plaza ({priceText})</>}</Button>
                            </div>
                        ) : (
                            <div className="text-center text-orange-500 p-4 bg-orange-100 rounded-lg"><AlertTriangle className="inline-block mr-2" />
                                {ride.seatsAvailable <= 0 ? "El viaje está completo." : "No puedes reservar este viaje."}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Conductor</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-between">
                        <Link to={`/profile/${ride.driver?.id}`} className="flex items-center gap-4 group">
                            <Avatar className="h-16 w-16"><AvatarImage src={ride.driver?.photoURL} /><AvatarFallback>{getInitials(ride.driver?.displayName)}</AvatarFallback></Avatar>
                            <div><p className="font-bold text-lg group-hover:underline">{ride.driver?.displayName}</p></div>
                        </Link>
                        {!isDriver && user && <Button variant="outline" onClick={handleContactDriver} disabled={isProcessing}>{isContacting ? <><Loader2 className="animate-spin h-4 w-4 mr-2"/>Abriendo...</> : <><MessageSquare className="mr-2 h-4 w-4"/>Contactar</>}</Button>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Pasajeros ({ride.passengers?.length || 0})</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {ride.passengers?.length > 0 ? ride.passengers.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <Link to={`/profile/${p.id}`} className="flex items-center gap-3 group">
                                    <Avatar><AvatarImage src={p.photoURL} /><AvatarFallback>{getInitials(p.displayName)}</AvatarFallback></Avatar>
                                    <div><p className="font-semibold group-hover:underline">{p.displayName}</p></div>
                                </Link>
                                <div className="flex items-center gap-2">
                                    {p.status === 'confirmed' && <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Confirmado</div>}
                                </div>
                            </div>
                        )) : <p className="text-muted-foreground text-center py-4">Sé el primero en unirte.</p>}
                    </CardContent>
                </Card>

            </main>
        </div>
    );
}

export default RideDetails;
