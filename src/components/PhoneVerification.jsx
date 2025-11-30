import { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Phone, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PhoneVerification = ({ user, onVerified }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [step, setStep] = useState('phone'); // 'phone' | 'code'
    const [loading, setLoading] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState(null);

    // Configurar reCAPTCHA
    const setupRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible',
                callback: () => {
                    // reCAPTCHA resuelto
                }
            });
        }
    };

    const handleSendCode = async () => {
        if (!phoneNumber.startsWith('+')) {
            toast.error('El número debe incluir el código de país (ej: +34)');
            return;
        }

        setLoading(true);
        try {
            setupRecaptcha();
            const appVerifier = window.recaptchaVerifier;
            
            // Enviar código SMS
            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setConfirmationResult(confirmation);
            setStep('code');
            toast.success('Código enviado a tu teléfono');
        } catch (error) {
            console.error('Error enviando código:', error);
            if (error.code === 'auth/invalid-phone-number') {
                toast.error('Número de teléfono inválido');
            } else if (error.code === 'auth/too-many-requests') {
                toast.error('Demasiados intentos. Intenta más tarde');
            } else {
                toast.error('Error al enviar código');
            }
            window.recaptchaVerifier?.clear();
            window.recaptchaVerifier = null;
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!confirmationResult) return;

        setLoading(true);
        try {
            // Verificar código
            await confirmationResult.confirm(verificationCode);
            
            // Actualizar perfil del usuario
            await updateDoc(doc(db, 'users', user.uid), {
                phoneNumber,
                phoneVerified: true,
                phoneVerifiedAt: new Date().toISOString()
            });

            toast.success('¡Teléfono verificado correctamente!');
            onVerified?.();
        } catch (error) {
            console.error('Error verificando código:', error);
            if (error.code === 'auth/invalid-verification-code') {
                toast.error('Código incorrecto');
            } else if (error.code === 'auth/code-expired') {
                toast.error('Código expirado. Solicita uno nuevo');
                setStep('phone');
            } else {
                toast.error('Error al verificar código');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Verificar Número de Teléfono
                </CardTitle>
                <CardDescription>
                    Verifica tu número para habilitar llamadas y aumentar tu confianza
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div id="recaptcha-container"></div>
                
                {step === 'phone' ? (
                    <>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Número de teléfono</label>
                            <Input
                                type="tel"
                                placeholder="+34 600 000 000"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                disabled={loading}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Incluye el código de país (ej: +34 para España)
                            </p>
                        </div>
                        <Button onClick={handleSendCode} disabled={loading || !phoneNumber} className="w-full">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                            Enviar Código
                        </Button>
                    </>
                ) : (
                    <>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Código de verificación</label>
                            <Input
                                type="text"
                                placeholder="000000"
                                maxLength={6}
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                disabled={loading}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Introduce el código de 6 dígitos enviado a {phoneNumber}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep('phone')} disabled={loading} className="flex-1">
                                Cambiar Número
                            </Button>
                            <Button onClick={handleVerifyCode} disabled={loading || verificationCode.length !== 6} className="flex-1">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                Verificar
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default PhoneVerification;
