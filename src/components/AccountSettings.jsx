import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card.jsx';
import { KeyRound, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { auth, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { sendPasswordResetEmail, deleteUser } from 'firebase/auth';

function AccountSettings() {
    const { refreshProfile } = useOutletContext();
    const [searchParams, setSearchParams] = useSearchParams();
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        // Limpiamos los parámetros de Stripe por si el usuario llega aquí por error.
        if (searchParams.get('success') || searchParams.get('reauth')) {
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('success');
            newParams.delete('reauth');
            setSearchParams(newParams);
            // Opcional: podríamos redirigir a /settings/payouts que es la página correcta
            // navigate('/settings/payouts', { replace: true }); 
        }
    }, [searchParams, setSearchParams]);

    const handlePasswordReset = async () => {
        if (!auth.currentUser?.email) return toast.error("No se ha podido identificar tu correo.");
        try {
            await sendPasswordResetEmail(auth, auth.currentUser.email);
            toast.success("Correo de reseteo enviado.");
        } catch (error) {
            toast.error("No se pudo enviar el correo.");
        }
    };

    const handleDeleteAccount = async () => {
        const user = auth.currentUser;
        if (!user || !window.confirm("¿Estás ABSOLUTAMENTE seguro? Esta acción es irreversible.")) return;

        setIsDeleting(true);
        try {
            const deleteAccount = httpsCallable(functions, 'deleteUserAccount_v2');
            await deleteAccount();
            await deleteUser(user);
            toast.success("Tu cuenta ha sido eliminada permanentemente.");
        } catch (error) {
            toast.error(error.code === 'auth/requires-recent-login' ? "Esta operación requiere que inicies sesión de nuevo." : "No se pudo eliminar la cuenta.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="container mx-auto p-4 max-w-2xl">
                <h1 className="text-3xl font-bold text-gray-800 my-6">Contraseña y Cuenta</h1>
                
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><KeyRound /> Cambiar Contraseña</CardTitle>
                        <CardDescription>Te enviaremos un correo para que puedas cambiar tu contraseña de forma segura.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handlePasswordReset}>Enviar correo de restablecimiento</Button>
                    </CardContent>
                </Card>

                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2"><Trash2 /> Eliminar Cuenta</CardTitle>
                        <CardDescription>Esta acción es irreversible y eliminará todos tus datos permanentemente.</CardDescription>
                    </CardHeader>
                    <CardFooter className="bg-destructive/10 p-4 flex justify-end">
                        <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
                            {isDeleting ? <><Loader2 className="animate-spin mr-2"/>Eliminando...</> : 'Eliminar mi cuenta'}</Button>
                        </CardFooter>
                </Card>
            </main>
        </div>
    );
}

export default AccountSettings;
