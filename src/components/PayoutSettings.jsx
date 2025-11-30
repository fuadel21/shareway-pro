import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Loader2, ExternalLink, Banknote, CheckCircle2, AlertTriangle } from 'lucide-react';
import SubPageHeader from './SubPageHeader';
import { toast } from 'sonner';
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';

// --- Hooks & Services ---
import { useWallet } from '../hooks/useWallet'; 
// INICIO DE LA CORRECCIÓN: Importar el nombre de función correcto
import { requestPayout } from '../services/walletService';
// FIN DE LA CORRECIÓN

// --- Componente StripeAccountStatus (sin cambios) ---
const StripeAccountStatus = ({ profile, onConnect, onManage, isConnecting, isManaging }) => {
    // ... (El JSX de este componente no cambia)
};

// --- Componente PayoutSection (con la llamada a función corregida) ---
const PayoutSection = ({ walletBalance, loadingWallet }) => {
    const [amount, setAmount] = useState('');
    const [isRequesting, setIsRequesting] = useState(false);

    const handlePayoutRequest = async () => {
        const payoutAmount = parseFloat(amount);
        if (isNaN(payoutAmount) || payoutAmount <= 0) {
            return toast.error("Introduce una cantidad válida para retirar.");
        }
        if (payoutAmount > walletBalance) {
            return toast.error("No puedes retirar más de tu saldo actual.");
        }

        setIsRequesting(true);
        try {
            // INICIO DE LA CORRECCIÓN: Usar la función correcta y pasar el valor en euros
            await requestPayout(payoutAmount);
            // FIN DE LA CORRECIÓN
            
            toast.success("¡Retiro solicitado!", { description: `Se transferirán ${payoutAmount.toFixed(2)} € a tu cuenta bancaria. Puede tardar unos días en reflejarse.` });
            setAmount('');
        } catch (error) {
            toast.error("Error al solicitar el retiro", { description: error.message });
        } finally {
            setIsRequesting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Retirar Saldo</CardTitle>
                <CardDescription>Transfiere el saldo de tu wallet a tu cuenta bancaria conectada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-gray-100 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Saldo disponible para retirar</p>
                    {loadingWallet ? (
                        <Loader2 className="h-6 w-6 mx-auto my-1 animate-spin text-gray-500" />
                    ) : (
                        <p className="text-3xl font-bold">{(walletBalance || 0).toFixed(2)} <span className="text-lg font-medium">€</span></p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Input 
                        type="number"
                        placeholder="Cantidad a retirar" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isRequesting}
                    />
                    <Button onClick={handlePayoutRequest} disabled={isRequesting || loadingWallet || walletBalance <= 0}>
                        {isRequesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Retirar'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// --- Componente Principal PayoutSettings (sin cambios en su lógica) ---
function PayoutSettings() {
    const { profile, user, refreshProfile } = useOutletContext();
    const { balance: walletBalance, loadingWallet } = useWallet(user);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isManaging, setIsManaging] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    
    // ... (El resto de la lógica de este componente no necesita cambios)
    useEffect(() => {
        const cameFromStripe = new URLSearchParams(location.search).get('stripe_return') === 'true';
        if (cameFromStripe && refreshProfile) {
            toast.info("Actualizando el estado de tu cuenta de Stripe...");
            refreshProfile();
            navigate(location.pathname, { replace: true });
        }
    }, [refreshProfile, location, navigate]);

    const handleConnectAccount = async () => { /* ... */ };
    const handleManageAccount = async () => { /* ... */ };
    
    return (
        <div className="min-h-screen bg-gray-50">
            <SubPageHeader title="Configuración de Cobros" />
            <main className="container mx-auto p-4 max-w-2xl mt-4 space-y-8">
                <StripeAccountStatus 
                    profile={profile} 
                    onConnect={handleConnectAccount} 
                    onManage={handleManageAccount}
                    isConnecting={isConnecting} 
                    isManaging={isManaging}
                />

                {profile?.stripeOnboarded && (
                    <PayoutSection walletBalance={walletBalance} loadingWallet={loadingWallet} />
                )}

                <Card>
                    <CardHeader><CardTitle>Historial de Pagos</CardTitle><CardDescription>Aquí verás todos los pagos que has recibido.</CardDescription></CardHeader>
                    <CardContent><div className="text-center text-gray-500 py-8"><Banknote className="mx-auto h-12 w-12 text-gray-400" /><p className="mt-4">Aún no has recibido ningún pago.</p></div></CardContent>
                </Card>
            </main>
        </div>
    );
}

export default PayoutSettings;
