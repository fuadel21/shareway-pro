import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, getBlob } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

// --- Componente para mostrar imagen segura ---
const SecureImage = ({ imagePath, alt }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!imagePath) {
            setLoading(false);
            return;
        }

        const fetchImage = async () => {
            try {
                const blob = await getBlob(ref(storage, imagePath));
                const objectUrl = URL.createObjectURL(blob);
                setImageUrl(objectUrl);
                // Limpiar el object URL cuando el componente se desmonte
                return () => URL.revokeObjectURL(objectUrl);
            } catch (err) {
                console.error(`Error al cargar la imagen desde ${imagePath}:`, err);
                setError('No se pudo cargar la imagen.');
            } finally {
                setLoading(false);
            }
        };

        fetchImage();
    }, [imagePath]);

    if (loading) return <div className="flex items-center justify-center bg-gray-200 h-48 rounded-lg"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>;
    if (error) return <div className="flex items-center justify-center bg-gray-100 h-48 rounded-lg text-red-500 text-sm p-4">{error}</div>;
    if (!imageUrl) return <p>No disponible</p>;

    return (
        <a href={imageUrl} target="_blank" rel="noopener noreferrer">
            <img src={imageUrl} alt={alt} className="rounded-lg border w-full object-contain" />
        </a>
    );
};

const VerificationReview = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                const userDocRef = doc(db, 'users', userId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUser({ id: userDoc.id, ...userDoc.data() });
                } else {
                    toast.error("Usuario no encontrado.");
                    navigate('/admin/verifications');
                }
            } catch (error) {
                toast.error("Error al cargar el usuario.");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [userId, navigate]);

    const handleVerificationAction = useCallback(async (status) => {
        setIsSubmitting(true);
        try {
            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, {
                'verification.status': status,
                'verification.reviewedAt': new Date(),
            });
            toast.success(`La verificación ha sido ${status === 'approved' ? 'aprobada' : 'rechazada'}.`);
            navigate('/admin/verifications');
        } catch (error) {
            toast.error("Error al actualizar la verificación.");
        } finally {
            setIsSubmitting(false);
        }
    }, [userId, navigate]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!user) {
        return <div className="text-center text-muted-foreground py-12">No se pudo cargar la información del usuario.</div>;
    }

    const { displayName, email, verification } = user;

    return (
        <div>
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Revisar Verificación: {displayName}</CardTitle>
                    <CardDescription>Email: {email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <h4 className="font-semibold">DNI (Frente)</h4>
                            <SecureImage imagePath={verification?.frontDNIPath} alt="DNI Frente" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-semibold">DNI (Dorso)</h4>
                            <SecureImage imagePath={verification?.backDNIPath} alt="DNI Dorso" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-semibold">Selfie</h4>
                            <SecureImage imagePath={verification?.selfiePath} alt="Selfie" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-6 border-t">
                        <Button variant="destructive" onClick={() => handleVerificationAction('rejected')} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Rechazar
                        </Button>
                        <Button onClick={() => handleVerificationAction('approved')} disabled={isSubmitting}>
                           {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Aprobar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default VerificationReview;
