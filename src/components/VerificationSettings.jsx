import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ShieldCheck, Camera, Phone, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { auth } from '../lib/firebase';
import { sendEmailVerification } from "firebase/auth";
import { toast } from 'sonner';
import PhoneVerification from './PhoneVerification';

const VerificationStep = ({ icon: Icon, title, description, status, actionText, onClick, isLoading, isCompleted, isDisabled }) => {
    const isPending = status === 'pending' || status === 'processing' || status === 'requires_input';

    let statusText = actionText;
    if (isCompleted) statusText = 'Verificado';
    else if (isPending) statusText = 'En Proceso';

    return (
        <div className="flex items-start gap-4 p-4">
            <Icon className={`h-8 w-8 mt-1 ${isCompleted ? 'text-green-500' : isPending ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            <div className="flex-1">
                <p className={`font-semibold ${isCompleted ? 'text-green-700' : isPending ? 'text-yellow-600' : 'text-foreground'}`}>{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Button onClick={onClick} variant={isCompleted ? "secondary" : "default"} disabled={isCompleted || isPending || isLoading || isDisabled} className="w-40">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : statusText}
            </Button>
        </div>
    );
};

function VerificationSettings() {
    const { profile, user } = useOutletContext();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(null);
    const [showPhoneVerification, setShowPhoneVerification] = useState(false);

    const handleResendVerificationEmail = async () => {
        setIsProcessing('email');
        try {
            const currentUser = auth.currentUser;
            if (currentUser && !currentUser.emailVerified) {
                await sendEmailVerification(currentUser);
                toast.success("¡Correo de verificación enviado!", { description: "Revisa tu bandeja de entrada (y spam)." });
            }
        } catch (error) {
            toast.error("No se pudo reenviar el correo.", { description: error.message });
        } finally {
            setIsProcessing(null);
        }
    };

    const verificationStatus = {
        email: profile?.emailVerified,
        phone: profile?.phoneVerified,
        identity: profile?.verification?.status,
    };

    return (
        <>
            <div className="min-h-screen bg-background text-foreground">
                <header className="bg-card border-b sticky top-0 z-10">
                    <div className="container mx-auto p-4 flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
                            <ArrowLeft />
                        </Button>
                        <h1 className="text-xl font-bold">Centro de Verificación</h1>
                    </div>
                </header>
                <main className="container mx-auto p-4 max-w-2xl pb-12 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Estado de Verificación</CardTitle>
                            <CardDescription>Aumenta la confianza y seguridad en la comunidad completando tu verificación.</CardDescription>
                        </CardHeader>
                        <CardContent className="divide-y">
                            <VerificationStep
                                icon={Mail}
                                title="Correo Electrónico"
                                description={verificationStatus.email ? "Tu correo ha sido verificado." : "Confirma tu dirección de correo electrónico."}
                                isCompleted={verificationStatus.email}
                                actionText="Reenviar Email"
                                onClick={handleResendVerificationEmail}
                                isLoading={isProcessing === 'email'}
                            />
                            <VerificationStep
                                icon={Phone}
                                title="Número de Teléfono"
                                description={verificationStatus.phone ? "Tu número ha sido verificado." : "Confirma tu número de teléfono móvil."}
                                isCompleted={verificationStatus.phone}
                                actionText="Verificar"
                                onClick={() => setShowPhoneVerification(true)}
                                isLoading={isProcessing === 'phone'}
                            />
                            <VerificationStep
                                icon={Camera}
                                title="Documento de Identidad"
                                description={
                                    verificationStatus.identity === 'verified' ? "Tu identidad ha sido verificada con éxito." :
                                        verificationStatus.identity === 'pending' ? "Tus documentos se están revisando." :
                                            "Sube tu DNI o pasaporte para verificar tu identidad."
                                }
                                status={verificationStatus.identity || 'unverified'}
                                isCompleted={verificationStatus.identity === 'verified'}
                                actionText="Verificar Identidad"
                                onClick={() => navigate('/verification-center')}
                                isLoading={isProcessing === 'identity'}
                            />
                        </CardContent>
                    </Card>

                    {/* Componente de verificación de teléfono */}
                    {showPhoneVerification && !verificationStatus.phone && (
                        <PhoneVerification
                            user={user}
                            onVerified={() => {
                                setShowPhoneVerification(false);
                                window.location.reload(); // Recargar para actualizar el estado
                            }}
                        />
                    )}
                </main>
            </div>
        </>
    );
}

export default VerificationSettings;
