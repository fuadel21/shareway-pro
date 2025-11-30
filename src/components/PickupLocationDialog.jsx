import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Loader2, MapPin } from 'lucide-react';
import AddressAutocomplete from './AddressAutocomplete';

const PickupLocationDialog = ({ open, onOpenChange, onConfirm, isLoading, rideOrigin }) => {
    const [pickupLocation, setPickupLocation] = useState(null);
    const [useRideOrigin, setUseRideOrigin] = useState(true);

    const handleConfirm = () => {
        if (useRideOrigin) {
            onConfirm(null); // null significa usar el origen del viaje
        } else if (pickupLocation) {
            onConfirm(pickupLocation);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>¿Dónde te recogemos?</DialogTitle>
                    <DialogDescription>
                        Especifica tu ubicación de recogida para que el conductor pueda encontrarte fácilmente.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Opción 1: Usar origen del viaje */}
                    <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${useRideOrigin ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        onClick={() => setUseRideOrigin(true)}
                    >
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                                <p className="font-semibold">Punto de encuentro del viaje</p>
                                <p className="text-sm text-muted-foreground">{rideOrigin}</p>
                            </div>
                        </div>
                    </div>

                    {/* Opción 2: Ubicación personalizada */}
                    <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${!useRideOrigin ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        onClick={() => setUseRideOrigin(false)}
                    >
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold mb-2">Ubicación personalizada</p>
                                {!useRideOrigin && (
                                    <AddressAutocomplete
                                        value={pickupLocation?.address || ''}
                                        onChange={setPickupLocation}
                                        placeholder="Introduce tu dirección exacta"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading || (!useRideOrigin && !pickupLocation)}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar y Unirse
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PickupLocationDialog;
