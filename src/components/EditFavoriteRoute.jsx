import { useState, useEffect } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import SubPageHeader from './SubPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.jsx";
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import AddressAutocomplete from './AddressAutocomplete.jsx';
import { saveFavoriteRoute } from '../services/rideService';

const weekDays = [{ value: '1', label: 'L' }, { value: '2', label: 'M' }, { value: '3', label: 'X' }, { value: '4', label: 'J' }, { value: '5', label: 'V' }, { value: '6', label: 'S' }, { value: '0', label: 'D' }];

const EditFavoriteRoute = () => {
    const { routeId } = useParams();
    const navigate = useNavigate();
    const { profile } = useOutletContext();

    const isNew = routeId === 'new';
    const [name, setName] = useState('');
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [days, setDays] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Cargar datos si se edita (próximo paso)

    const handleSave = async () => {
        if (!name || !origin || !destination || days.length === 0) {
            return toast.error("Por favor, completa todos los campos.");
        }
        setIsSaving(true);
        try {
            // --- ¡CORRECCIÓN CRÍTICA! ---
            // Limpiamos los objetos de origin y destination para que solo contengan datos serializables.
            const routeData = {
                name,
                origin: {
                    address: origin.address,
                    coordinates: origin.coordinates
                },
                destination: {
                    address: destination.address,
                    coordinates: destination.coordinates
                },
                days
            };

            if (!isNew) {
                routeData.routeId = routeId;
            }

            const success = await saveFavoriteRoute(profile.uid, routeData);

            if (success) {
                toast.success("¡Ruta guardada con éxito!");
                navigate('/favorite-routes');
            }
            // El else no es necesario porque el servicio ya muestra el toast de error.

        } catch (error) {
            // Este catch es para errores inesperados del lado del cliente, no del servicio.
            toast.error("Error inesperado al guardar la ruta", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleOriginSelect = (place) => {
        if (place) setOrigin({ address: place.address, coordinates: place.coordinates });
        else setOrigin(null);
    };

    const handleDestinationSelect = (place) => {
        if (place) setDestination({ address: place.address, coordinates: place.coordinates });
        else setDestination(null);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <SubPageHeader title={isNew ? 'Crear Ruta Habitual' : 'Editar Ruta Habitual'} />
            <main className="container mx-auto p-4 max-w-2xl pb-12">
                <Card>
                    <CardHeader>
                        <CardTitle>Detalles de la Ruta</CardTitle>
                        <CardDescription>Guarda tus trayectos frecuentes para recibir notificaciones de viajes compatibles.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div><Label>Nombre</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Ir a la oficina" /></div>
                        <div>
                            <Label>Origen</Label>
                            <AddressAutocomplete
                                onChange={handleOriginSelect}
                                placeholder="Dirección de origen"
                                value={origin?.address}
                            />
                        </div>
                        <div>
                            <Label>Destino</Label>
                            <AddressAutocomplete
                                onChange={handleDestinationSelect}
                                placeholder="Dirección de destino"
                                value={destination?.address}
                            />
                        </div>
                        <div>
                            <Label>Días de la Semana</Label>
                            <ToggleGroup type="multiple" value={days} onValueChange={setDays} variant="outline" className="flex-wrap justify-start mt-1">
                                {weekDays.map(day => <ToggleGroupItem key={day.value} value={day.value} className="rounded-full">{day.label}</ToggleGroupItem>)}
                            </ToggleGroup>
                        </div>
                    </CardContent>
                </Card>
                <div className="mt-8 flex justify-end">
                    <Button onClick={handleSave} size="lg" disabled={isSaving}>
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : <><Save className="mr-2 h-4 w-4" /> Guardar Ruta</>}
                    </Button>
                </div>
            </main>
        </div>
    );
};

export default EditFavoriteRoute;
