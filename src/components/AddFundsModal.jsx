import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';

import { addFundsToWallet } from '../services/walletService';
import { STRIPE_PUBLISHABLE_KEY } from '../lib/firebaseConfig';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Cargar Stripe fuera del renderizado del componente para evitar recargas.
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

// --- Componente Interno del Formulario de Pago ---
const CheckoutForm = ({ amount, onSuccessfulPayment, onClose }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!stripe || !elements) return; // Stripe.js no se ha cargado todavía.

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) return;

        setIsLoading(true);

        try {
            // 1. Crear el método de pago a partir de los datos de la tarjeta
            const { error: createPaymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
            });

            if (createPaymentMethodError) {
                throw new Error(createPaymentMethodError.message);
            }

            // 2. Llamar a nuestro backend con el monto y el ID del método de pago
            const result = await addFundsToWallet(amount, paymentMethod.id);

            if (result.success) {
                toast.success("¡Recarga exitosa!", { description: `Se añadieron ${amount.toFixed(2)} € a tu wallet.` });
                onSuccessfulPayment();
            } else if (result.requiresAction) {
                // 3. (Manejo de 3D Secure) Si el banco requiere autenticación adicional
                toast.info("Se requiere verificación adicional.");
                const { error: confirmCardPaymentError } = await stripe.confirmCardPayment(result.clientSecret);
                if (confirmCardPaymentError) {
                    throw new Error(confirmCardPaymentError.message);
                }
                toast.success("¡Verificación completada y recarga exitosa!");
                onSuccessfulPayment();
            } else {
                throw new Error(result.message || "Ocurrió un error desconocido.");
            }
        } catch (error) {
            console.error("Error en el proceso de pago:", error);
            toast.error('Error al procesar el pago', { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // Estilo para el campo de la tarjeta
    const cardElementOptions = {
        style: {
            base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                    color: '#aab7c4',
                },
            },
            invalid: {
                color: '#9e2146',
            },
        },
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-2 border rounded-md">
                <CardElement options={cardElementOptions} />
            </div>
            <DialogFooter>
                <Button onClick={onClose} variant="ghost">Cancelar</Button>
                <Button type="submit" disabled={!stripe || isLoading} className="w-28">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pagar ${amount.toFixed(2)} €`}
                </Button>
            </DialogFooter>
        </form>
    );
};

// --- Componente Principal del Modal ---
const AddFundsModal = ({ isOpen, onClose }) => {
    const [amount, setAmount] = useState(20); // Valor inicial en euros
    const [showPaymentForm, setShowPaymentForm] = useState(false);

    const handleContinue = () => {
        if (amount < 5) { // Mínimo de Stripe es 0.50, pero 5 es más razonable.
            toast.error("La cantidad mínima para recargar es de 5.00 €.");
            return;
        }
        setShowPaymentForm(true);
    };

    const resetAndClose = () => {
        setShowPaymentForm(false);
        setAmount(20);
        onClose();
    };

    // Si no hay clave de Stripe, no renderizar nada para evitar errores.
    if (!stripePromise) {
        console.error("CRÍTICO: La clave publicable de Stripe no está configurada.");
        return null; 
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Añadir Fondos a tu Wallet</DialogTitle>
                    <DialogDescription>
                        {showPaymentForm ? 'Introduce los datos de tu tarjeta.' : 'Elige la cantidad que deseas recargar.'}
                    </DialogDescription>
                </DialogHeader>

                {!showPaymentForm ? (
                    <div className="space-y-4 pt-4">
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium mb-1">Cantidad (€)</label>
                            <Input 
                                id="amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                placeholder="Ej. 50"
                                min="5"
                            />
                        </div>
                        <DialogFooter>
                             <Button onClick={resetAndClose} variant="ghost">Cancelar</Button>
                            <Button onClick={handleContinue} className="w-28">Continuar</Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <Elements stripe={stripePromise}>
                        <CheckoutForm 
                            amount={amount} 
                            onSuccessfulPayment={resetAndClose} 
                            onClose={resetAndClose} 
                        />
                    </Elements>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AddFundsModal;
