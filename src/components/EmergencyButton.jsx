import React, { useState } from 'react';
import { AlertTriangle, Phone, MapPin, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export function EmergencyButton({ rideId, driverInfo, currentLocation }) {
    const [showDialog, setShowDialog] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleEmergencyCall = () => {
        // Llamar a emergencias (112 en Europa)
        window.location.href = 'tel:112';
        toast.info('Llamando a emergencias...');
    };

    const handleShareLocation = async () => {
        if (!currentLocation) {
            toast.error('No se pudo obtener tu ubicación');
            return;
        }

        setIsProcessing(true);
        try {
            // Compartir ubicación con contacto de emergencia
            const emergencyContact = localStorage.getItem('emergencyContact');

            if (!emergencyContact) {
                toast.warning('No tienes un contacto de emergencia configurado', {
                    description: 'Ve a Configuración → Seguridad para añadir uno'
                });
                setIsProcessing(false);
                return;
            }

            const locationUrl = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
            const message = `🚨 EMERGENCIA: Estoy en un viaje compartido y necesito ayuda. Mi ubicación: ${locationUrl}`;

            // En una app real, esto enviaría SMS o notificación
            // Por ahora, copiamos al portapapeles
            await navigator.clipboard.writeText(message);

            toast.success('Ubicación copiada al portapapeles', {
                description: 'Compártela con tu contacto de emergencia'
            });
        } catch (error) {
            console.error('Error compartiendo ubicación:', error);
            toast.error('Error al compartir ubicación');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReportIssue = async () => {
        setIsProcessing(true);
        try {
            const reportEmergency = httpsCallable(functions, 'reportEmergency');
            await reportEmergency({
                rideId,
                location: currentLocation,
                timestamp: new Date().toISOString()
            });

            toast.success('Emergencia reportada a la plataforma', {
                description: 'El equipo de soporte ha sido notificado'
            });

            setShowDialog(false);
        } catch (error) {
            console.error('Error reportando emergencia:', error);
            toast.error('Error al reportar emergencia');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            {/* Botón SOS flotante */}
            <button
                onClick={() => setShowDialog(true)}
                className="fixed bottom-24 right-4 z-50 w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                aria-label="Botón de emergencia"
            >
                <Shield className="w-8 h-8" />
            </button>

            {/* Dialog de emergencia */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                            Emergencia
                        </DialogTitle>
                        <DialogDescription>
                            ¿Necesitas ayuda? Selecciona una opción
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-4">
                        {/* Llamar a emergencias */}
                        <Button
                            onClick={handleEmergencyCall}
                            className="w-full h-auto py-4 bg-red-600 hover:bg-red-700 text-white"
                            size="lg"
                        >
                            <Phone className="w-5 h-5 mr-2" />
                            <div className="text-left flex-1">
                                <div className="font-bold">Llamar a Emergencias (112)</div>
                                <div className="text-xs opacity-90">Policía, ambulancia, bomberos</div>
                            </div>
                        </Button>

                        {/* Compartir ubicación */}
                        <Button
                            onClick={handleShareLocation}
                            variant="outline"
                            className="w-full h-auto py-4 border-2"
                            size="lg"
                            disabled={isProcessing}
                        >
                            <MapPin className="w-5 h-5 mr-2" />
                            <div className="text-left flex-1">
                                <div className="font-bold">Compartir Ubicación</div>
                                <div className="text-xs text-muted-foreground">Con tu contacto de emergencia</div>
                            </div>
                        </Button>

                        {/* Reportar a plataforma */}
                        <Button
                            onClick={handleReportIssue}
                            variant="outline"
                            className="w-full h-auto py-4 border-2"
                            size="lg"
                            disabled={isProcessing}
                        >
                            <Shield className="w-5 h-5 mr-2" />
                            <div className="text-left flex-1">
                                <div className="font-bold">Reportar a Plataforma</div>
                                <div className="text-xs text-muted-foreground">Notificar al equipo de soporte</div>
                            </div>
                        </Button>
                    </div>

                    {/* Info del viaje */}
                    {driverInfo && (
                        <div className="border-t pt-4 text-sm text-muted-foreground">
                            <p><strong>Conductor:</strong> {driverInfo.displayName}</p>
                            <p><strong>ID del viaje:</strong> {rideId?.substring(0, 8)}...</p>
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        onClick={() => setShowDialog(false)}
                        className="w-full"
                    >
                        Cancelar
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
}
