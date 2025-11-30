import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, Link, useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { getOrCreateChat } from '../services/chatService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Calendar, PackageCheck, Wallet, User, MessageSquare, Shield, Check, Bike, Home, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import CallButton from './CallButton';

const PackageDetails = () => {
    const { id } = useParams();
    const { profile: currentUserProfile } = useOutletContext();
    const navigate = useNavigate();
    const [pkg, setPkg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const pkgDocRef = doc(db, 'packages', id);
        const unsubscribe = onSnapshot(pkgDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setPkg({ id: docSnap.id, ...docSnap.data() });
            } else {
                toast.error("Envío no encontrado.");
                navigate('/my-packages');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [id, navigate]);

    const updatePackageStatus = async (status, successMessage) => {
        setIsSubmitting(true);
        try {
            await updateDoc(doc(db, 'packages', id), { status });
            toast.success(successMessage);
        } catch (error) {
            toast.error("Error al actualizar.", { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleAcceptPackage = async () => {
        if (!confirm("¿Estás seguro de que quieres aceptar este envío? Te comprometes a transportarlo.")) return;
        setIsSubmitting(true);
        try {
            const pkgDocRef = doc(db, 'packages', id);
            await updateDoc(pkgDocRef, {
                status: 'accepted',
                driver: {
                    uid: currentUserProfile.uid,
                    name: currentUserProfile.name,
                    photoURL: currentUserProfile.photoURL,
                }
            });
            toast.success("¡Envío aceptado!", { description: "Ponte en contacto con el remitente para coordinar la recogida." });
        } catch (error) {
            toast.error("Error al aceptar el envío.", { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleConfirmPickup = () => updatePackageStatus('picked_up', 'Paquete recogido y en ruta.');
    const handleConfirmDelivery = () => updatePackageStatus('completed', '¡Paquete entregado!');
    const handleCancelPackage = () => {
        if (!confirm("¿Seguro que quieres cancelar este envío?")) return;
        updatePackageStatus('cancelled', 'Envío cancelado.');
    };

    const handleContact = async (otherUserId) => {
        setIsSubmitting(true);
        try {
            const chatId = await getOrCreateChat(currentUserProfile.uid, otherUserId);
            navigate(`/chat/${chatId}`);
        } catch (error) {
            toast.error("Error al iniciar el chat.", { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || !currentUserProfile) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!pkg) return null;

    const isSender = currentUserProfile.uid === pkg.sender.uid;
    const isDriver = currentUserProfile.uid === pkg.driver?.uid;

    const canAccept = !isSender && pkg.status === 'pending';
    const canManageAsDriver = isDriver && (pkg.status === 'accepted' || pkg.status === 'picked_up');
    const canCancel = isSender && (pkg.status === 'pending' || pkg.status === 'accepted');
    const canContact = (isSender && pkg.driver) || isDriver;

    return (
        <div className="max-w-2xl mx-auto p-4 pb-24">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Detalles del Envío</CardTitle>
                    <CardDescription>De {pkg.origin.address} a {pkg.destination.address}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Remitente</h3>
                            <Link to={`/profile/${pkg.sender.uid}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100">
                                <Avatar><AvatarImage src={pkg.sender.photoURL} /><AvatarFallback>{pkg.sender.name.charAt(0)}</AvatarFallback></Avatar>
                                <span className="font-medium">{pkg.sender.name}</span>
                            </Link>
                        </div>
                        {pkg.driver && (
                            <div>
                                <h3 className="font-semibold mb-2">Transportista</h3>
                                <Link to={`/profile/${pkg.driver.uid}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100">
                                    <Avatar><AvatarImage src={pkg.driver.photoURL} /><AvatarFallback>{pkg.driver.name.charAt(0)}</AvatarFallback></Avatar>
                                    <span className="font-medium">{pkg.driver.name}</span>
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="border-t pt-4 space-y-2 text-sm">
                        <div className="flex items-center"><Calendar className="mr-2 h-5 w-5 text-gray-600" /><span>Entregar antes del: {format(pkg.deliveryBy.toDate(), "d MMM yyyy", { locale: es })}</span></div>
                        <div className="flex items-center"><Wallet className="mr-2 h-5 w-5 text-gray-600" /><span>Precio: {pkg.price.toFixed(2)}€</span></div>
                        <div className="flex items-center"><PackageCheck className="mr-2 h-5 w-5 text-gray-600" /><span>Tamaño: {pkg.size}</span></div>
                    </div>
                    <div className="border-t pt-4 text-sm">
                        <h3 className="font-semibold mb-1">Descripción</h3>
                        <p className="text-gray-700">{pkg.description}</p>
                    </div>

                    <div className="border-t pt-6 flex justify-between items-center">
                        <div>
                            {canContact && (
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => handleContact(isSender ? pkg.driver.uid : pkg.sender.uid)} disabled={isSubmitting}>
                                        <MessageSquare className="mr-2 h-4 w-4" />
                                        {isSender ? 'Contactar Transportista' : 'Contactar Remitente'}
                                    </Button>
                                    <CallButton
                                        recipientId={isSender ? pkg.driver?.uid : pkg.sender?.uid}
                                        recipientName={isSender ? pkg.driver?.name : pkg.sender?.name}
                                        recipientPhoto={isSender ? pkg.driver?.photoURL : pkg.sender?.photoURL}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {canAccept && <Button size="lg" onClick={handleAcceptPackage} disabled={isSubmitting}><PackageCheck className="mr-2" />Aceptar Envío</Button>}
                            {canManageAsDriver && pkg.status === 'accepted' && <Button size="lg" onClick={handleConfirmPickup} disabled={isSubmitting}><Bike className="mr-2" />Confirmar Recogida</Button>}
                            {canManageAsDriver && pkg.status === 'picked_up' && <Button size="lg" onClick={handleConfirmDelivery} disabled={isSubmitting}><Home className="mr-2" />Confirmar Entrega</Button>}
                            {canCancel && <Button variant="destructive" onClick={handleCancelPackage} disabled={isSubmitting}><XCircle className="mr-2" />Cancelar</Button>}
                            {pkg.status === 'completed' && <p className="font-semibold text-green-600 flex items-center"><Check className="mr-2" />¡Entregado!</p>}
                            {pkg.status === 'cancelled' && <p className="font-semibold text-red-600">Cancelado</p>}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default PackageDetails;
