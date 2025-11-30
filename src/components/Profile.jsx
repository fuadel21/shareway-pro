import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Loader2, Save, Camera, Car, Wallet, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

import { db, auth, storage, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserRating } from './UserRating.jsx';
import { AchievementsList } from './AchievementsList';

const getInitials = (name) => {
    if (typeof name !== 'string' || !name.trim()) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase();
};

function Profile() {
    const { profile: initialProfile, refreshProfile } = useOutletContext(); // <-- refreshProfile añadido
    const [profile, setProfile] = useState(initialProfile);

    const [formData, setFormData] = useState({
        displayName: '',
        phone: '',
        vehicleMake: '', vehicleModel: '', vehicleColor: '', vehiclePlate: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isStripeLoading, setIsStripeLoading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!initialProfile?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', initialProfile.uid), (doc) => {
            const data = doc.data();
            setProfile(data);
            setFormData({
                displayName: data.displayName || '',
                phone: data.phone || '',
                vehicleMake: data.vehicle?.make || '',
                vehicleModel: data.vehicle?.model || '',
                vehicleColor: data.vehicle?.color || '',
                vehiclePlate: data.vehicle?.plate || ''
            });
        });
        return () => unsub();
    }, [initialProfile?.uid]);

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !profile) return;
        setIsUploading(true);
        try {
            const compressedFile = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 800 });
            const photoRef = ref(storage, `avatars/${profile.uid}`);
            await uploadBytes(photoRef, compressedFile);
            const photoURL = await getDownloadURL(photoRef);
            await updateProfile(auth.currentUser, { photoURL });
            await updateDoc(doc(db, 'users', profile.uid), { photoURL });
            toast.success("Foto de perfil actualizada.");
        } catch (error) {
            toast.error("No se pudo cambiar la foto.", { description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSaveChanges = async (e) => {
        e.preventDefault();
        if (!profile) return;
        setIsSaving(true);
        const { displayName, phone, vehicleMake, vehicleModel, vehicleColor, vehiclePlate } = formData;
        try {
            if (auth.currentUser?.displayName !== displayName) {
                await updateProfile(auth.currentUser, { displayName });
            }
            await updateDoc(doc(db, 'users', profile.uid), {
                displayName,
                phone,
                vehicle: { make: vehicleMake, model: vehicleModel, color: vehicleColor, plate: vehiclePlate },
            });
            toast.success("Perfil actualizado.");
        } catch (error) {
            toast.error("No se pudo actualizar el perfil.", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleStripeOnboarding = async () => {
        setIsStripeLoading(true);
        try {
            let accountId = profile.stripeAccountId;
            if (!accountId) {
                const createStripeAccount = httpsCallable(functions, 'createStripeAccount_v2');
                const result = await createStripeAccount();
                accountId = result.data.accountId;
                await refreshProfile(); // Refresh to get the new accountId in the profile state
            }

            const createStripeAccountLink = httpsCallable(functions, 'createStripeAccountLink_v2');
            const linkResult = await createStripeAccountLink({ accountId });
            window.location.href = linkResult.data.url;

        } catch (error) {
            toast.error("Error al conectar con Stripe", { description: "No se pudo generar el enlace de configuración. Por favor, inténtalo de nuevo." });
            console.error(error);
        } finally {
            setIsStripeLoading(false);
        }
    }

    if (!profile) {
        return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    return (
        <div className="container mx-auto p-4 space-y-8">
            <form onSubmit={handleSaveChanges}>
                {/* ... (Sección de Perfil sin cambios) ... */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">{/* ... */}</CardHeader>
                    <CardContent className="space-y-4">{/* ... */}</CardContent>
                </Card>

                {/* -- Sección del Vehículo (sin cambios) -- */}
                <Card>{/* ... */}</Card>

                {/* -- Logros -- */}
                <AchievementsList userId={profile.uid} />

                {/* -- Conexión con Stripe -- */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Wallet />Pagos de Conductor</CardTitle>
                        <CardDescription>Conecta tu cuenta a Stripe para recibir los pagos de tus pasajeros de forma segura.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {profile.stripeAccountId && profile.stripeChargesEnabled ? (
                            <div className="p-6 bg-green-50 rounded-lg flex flex-col items-center text-center">
                                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                                <h3 className="text-xl font-bold text-green-800">¡Todo listo para recibir pagos!</h3>
                                <p className="text-green-700 mt-2 mb-6">Tu cuenta está conectada y verificada. Ya puedes recibir el dinero de tus viajes.</p>
                                <Button onClick={handleStripeOnboarding} disabled={isStripeLoading} variant="outline">
                                    {isStripeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Gestionar Cuenta en Stripe
                                </Button>
                            </div>
                        ) : (
                            <div className="p-6 bg-blue-50 rounded-lg flex flex-col items-center text-center">
                                <h3 className="text-xl font-bold text-blue-800">Conviértete en Conductor</h3>
                                <p className="text-blue-700 mt-2 mb-6">Conecta tu cuenta bancaria a través de Stripe, nuestro proveedor de pagos seguro, para empezar a recibir dinero por tus viajes.</p>
                                <Button onClick={handleStripeOnboarding} disabled={isStripeLoading} size="lg">
                                    {isStripeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Conectar con Stripe y Empezar
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* -- Botón de Guardar -- */}
                <div className="flex justify-end sticky bottom-20 pb-4">
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Cambios
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default Profile;
