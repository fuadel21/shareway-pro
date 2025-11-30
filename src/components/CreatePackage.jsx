import React, { useState, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Loader2, CalendarIcon, PackageCheck, Box, Package as PackageIcon, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete.jsx';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '@/lib/utils';

const CreatePackage = () => {
    const { mapsLoaded, profile: currentUserProfile } = useOutletContext();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [deliveryBy, setDeliveryBy] = useState(null);
    const [size, setSize] = useState('small');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');

    const handleOriginSelect = useCallback((place) => setOrigin(place), []);
    const handleDestinationSelect = useCallback((place) => setDestination(place), []);

    const handleCreatePackage = async (e) => {
        e.preventDefault();
        if (!origin || !destination || !deliveryBy || !price || !description) {
            toast.error("Por favor, completa todos los campos obligatorios.");
            return;
        }
        setIsLoading(true);

        try {
            await addDoc(collection(db, 'packages'), {
                sender: {
                    uid: currentUserProfile.uid,
                    name: currentUserProfile.name,
                    photoURL: currentUserProfile.photoURL,
                },
                origin: { address: origin.address, coordinates: origin.coordinates },
                destination: { address: destination.address, coordinates: destination.coordinates },
                deliveryBy: deliveryBy,
                size: size,
                price: Number(price),
                description: description,
                status: 'pending', // pending -> accepted -> completed/cancelled
                createdAt: serverTimestamp(),
            });
            toast.success("¡Solicitud de envío publicada!");
            navigate('/explore'); // O a una futura página de "Mis Envíos"
        } catch (error) {
            console.error("Error creating package: ", error);
            toast.error("Error al publicar el envío.", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    if (!mapsLoaded || !currentUserProfile) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/> Cargando...</div>;

    return (
        <div className="max-w-2xl mx-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Publicar un Envío</CardTitle>
                    <CardDescription>Completa los detalles del paquete que quieres enviar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreatePackage} className="space-y-6">
                        {/* Origen y Destino */}
                        <div className="space-y-4">
                           <div><label className="block text-sm font-medium mb-1">Origen</label><GooglePlacesAutocomplete id="origin" placeholder="Lugar de recogida" onPlaceSelect={handleOriginSelect} /></div>
                           <div><label className="block text-sm font-medium mb-1">Destino</label><GooglePlacesAutocomplete id="destination" placeholder="Lugar de entrega" onPlaceSelect={handleDestinationSelect} /></div>
                        </div>

                        {/* Fecha y Precio */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Entregar antes del</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !deliveryBy && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {deliveryBy ? format(deliveryBy, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={deliveryBy} onSelect={setDeliveryBy} initialFocus fromDate={new Date()} /></PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label htmlFor="price">Precio ofrecido (€)</Label>
                                <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="1" step="0.5" required placeholder="ej: 8.50"/>
                            </div>
                        </div>

                        {/* Tamaño */}
                        <div>
                             <Label>Tamaño del paquete</Label>
                             <ToggleGroup type="single" value={size} onValueChange={(value) => value && setSize(value)} variant="outline" className="mt-2 justify-start">
                                 <ToggleGroupItem value="small" className="flex-1"><FileText className="h-4 w-4 mr-2"/>Pequeño</ToggleGroupItem>
                                 <ToggleGroupItem value="medium" className="flex-1"><PackageIcon className="h-4 w-4 mr-2"/>Mediano</ToggleGroupItem>
                                 <ToggleGroupItem value="large" className="flex-1"><Box className="h-4 w-4 mr-2"/>Grande</ToggleGroupItem>
                             </ToggleGroup>
                        </div>

                        {/* Descripción */}
                        <div>
                            <Label htmlFor="description">Descripción del contenido</Label>
                            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Documentos importantes, un regalo..." required />
                        </div>

                        <Button type="submit" disabled={isLoading} className="w-full h-12 text-base">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-5 w-5"/>}
                            Publicar Envío
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreatePackage;
