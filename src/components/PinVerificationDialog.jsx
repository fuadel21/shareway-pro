import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const PinVerificationDialog = ({ open, onOpenChange, onConfirm, isLoading }) => {
    const [pin, setPin] = useState('');

    const handleConfirm = () => {
        if (pin.length === 4) {
            onConfirm(pin);
        }
    };

    const handlePinChange = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, ''); // Solo permitir números
        if (value.length <= 4) {
            setPin(value);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Verificación de Pasajero</DialogTitle>
                    <DialogDescription>Pídele al primer pasajero su PIN de 4 dígitos para poder iniciar el viaje.</DialogDescription>
                </DialogHeader>
                <div className="my-4">
                    <Input 
                        value={pin}
                        onChange={handlePinChange}
                        maxLength={4}
                        placeholder="_ _ _ _"
                        className="text-center text-3xl tracking-[1.5em] font-mono w-48 mx-auto"
                    />
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} variant="ghost">Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={isLoading || pin.length !== 4}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                        Confirmar e Iniciar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PinVerificationDialog;
