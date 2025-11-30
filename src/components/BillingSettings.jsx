import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';

import SubPageHeader from './SubPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from './CheckoutForm';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/firebaseConfig';
import { Loader2 } from 'lucide-react';

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const creditPackages = [
    { credits: 5, price: 5.00, id: 'price_1PFl0SRxcm33Sg25w6a9aUtq' }, 
    { credits: 10, price: 10.00, id: 'price_1PFl0jRxcm33Sg255VzD22M0' },
    { credits: 25, price: 25.00, id: 'price_1PFl0wRxcm33Sg25bX1yVfKx' },
    { credits: 50, price: 50.00, id: 'price_1PFl1ERxcm33Sg258Jc8E9E2' },
];

const BillingSettings = () => {
    const { profile } = useOutletContext();
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [paymentClientSecret, setPaymentClientSecret] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePackageSelect = async (pkg) => {
        if (!profile) {
            toast.error("Debes iniciar sesión para comprar créditos.");
            return;
        }

        setSelectedPackage(pkg);
        setIsProcessing(true);

        try {
            // --- ACTUALIZACIÓN A V2 ---
            const createCreditPurchase = httpsCallable(functions, 'createCreditPurchaseIntent_v2');
            const result = await createCreditPurchase({ packageId: pkg.id });
            
            if (result.data.clientSecret) {
                setPaymentClientSecret(result.data.clientSecret);
            } else {
                throw new Error("No se pudo inicializar el pago.");
            }
        } catch (error) {
            console.error("Error al crear la intención de pago:", error);
            toast.error("Error al iniciar el pago", { description: error.message });
            setSelectedPackage(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSuccessfulPayment = () => {
        toast.success("¡Compra completada!", { 
            description: `Se han añadido ${selectedPackage?.credits} créditos a tu cuenta.` 
        });
        setPaymentClientSecret(null);
        setSelectedPackage(null);
    };

    const stripeOptions = { clientSecret: paymentClientSecret };

    return (
        <>
            <div className="max-w-4xl mx-auto p-4">
                <SubPageHeader title="Facturación y Cartera" />
                
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Comprar Créditos</CardTitle>
                        <CardDescription>Los créditos se usarán para futuras reservas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {creditPackages.map(pkg => (
                                <Button 
                                    key={pkg.credits}
                                    variant="outline"
                                    className="h-auto p-4 flex flex-col items-center justify-center gap-2 relative"
                                    onClick={() => handlePackageSelect(pkg)}
                                    disabled={isProcessing}
                                >
                                    {isProcessing && selectedPackage?.id === pkg.id && <Loader2 className="absolute h-6 w-6 animate-spin"/>}
                                    <span className={`text-xl font-bold ${isProcessing && selectedPackage?.id === pkg.id ? 'opacity-20' : ''}`}>{pkg.credits} Créditos</span>
                                    <span className={`text-lg ${isProcessing && selectedPackage?.id === pkg.id ? 'opacity-20' : ''}`}>{pkg.price.toFixed(2)}€</span>
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!paymentClientSecret} onOpenChange={() => setPaymentClientSecret(null)}>
                 <DialogContent>
                     <DialogHeader>
                         <DialogTitle>Comprar {selectedPackage?.credits} Créditos</DialogTitle>
                         <DialogDescription>Total a pagar: {selectedPackage?.price.toFixed(2)}€</DialogDescription>
                     </DialogHeader>
                     {paymentClientSecret && (
                        <Elements stripe={stripePromise} options={stripeOptions}>
                            <CheckoutForm onSuccessfulPayment={handleSuccessfulPayment} />
                        </Elements>
                     )}
                 </DialogContent>
            </Dialog>
        </>
    );
};

export default BillingSettings;
