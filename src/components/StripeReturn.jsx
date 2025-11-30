import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase'; // Importa la app de firebase inicializada

function StripeReturn() {
    const navigate = useNavigate();
    const functionsRegion = 'europe-west1'; // Define la región

    useEffect(() => {
        const verifyAccount = async () => {
            toast.info("Verificando el estado de tu cuenta de Stripe...");
            try {
                const functions = getFunctions(app, functionsRegion);
                // --- ACTUALIZACIÓN A V2 ---
                const checkStripeAccountStatus = httpsCallable(functions, 'checkStripeAccountStatus_v2');
                
                const result = await checkStripeAccountStatus();

                if (result.data.success) {
                    toast.success("¡Tu cuenta ha sido conectada con éxito!");
                } else {
                    toast.warning("Parece que no has completado el registro en Stripe.", { description: "Puedes intentarlo de nuevo cuando quieras." });
                }

            } catch (error) {
                console.error("Error al verificar la cuenta de Stripe:", error);
                toast.error("Hubo un problema al verificar tu cuenta.", { description: error.message || "Por favor, inténtalo más tarde." });
            } finally {
                navigate('/settings/payouts');
            }
        };

        verifyAccount();
    }, [navigate]);

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 space-y-4">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            <p className="text-lg text-gray-700">Finalizando la conexión con Stripe...</p>
            <p className="text-sm text-gray-500">Serás redirigido en un momento.</p>
        </div>
    );
}

export default StripeReturn;
