import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PhoneVerificationDialog = ({ open, onOpenChange, confirmationResult }) => {
    const [code, setCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const { refreshProfile } = useOutletContext(); // Obtener la función para refrescar

    const handleConfirm = async () => {
        if (!code || code.length !== 6 || !confirmationResult) return;
        setIsVerifying(true);
        try {
            // 1. Confirmar el código con Firebase
            const userCredential = await confirmationResult.confirm(code);
            const user = userCredential.user;

            // 2. Si es exitoso, actualizar el documento en Firestore
            if (user && user.uid) {
                const userDocRef = doc(db, 'users', user.uid);
                await updateDoc(userDocRef, {
                    isPhoneVerified: true,
                    phoneNumber: user.phoneNumber // Guarda el número de teléfono verificado
                });
            }

            // 3. Refrescar el perfil para que toda la app se actualice
            if (refreshProfile) {
                refreshProfile();
            }
            
            // 4. Notificar al usuario y cerrar el diálogo
            toast.success("¡Número de teléfono verificado con éxito!");
            onOpenChange(false);

        } catch (error) {
            toast.error("Código inválido o expirado.", { description: "Por favor, revisa el código o intenta enviar uno nuevo." });
            console.error("Error al confirmar el código del teléfono:", error);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Verificar Número de Teléfono</DialogTitle>
                    <DialogDescription>Introduce el código de 6 dígitos que hemos enviado a tu móvil.</DialogDescription>
                </DialogHeader>
                <div className="my-4">
                    <Input 
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        maxLength={6}
                        placeholder="_ _ _ _ _ _"
                        className="text-center text-2xl tracking-[1em] font-mono"
                    />
                </div>
                <DialogFooter>
                    <Button onClick={handleConfirm} disabled={isVerifying || code.length !== 6}>
                        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PhoneVerificationDialog;
