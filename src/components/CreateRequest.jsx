import React, { useState, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, CalendarIcon, CheckCircle } from 'lucide-react';
import { format, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';
import AddressAutocomplete from './AddressAutocomplete.jsx';
import { createSingleRequest } from '../services/requestService.js';
import { cn } from '@/lib/utils';

const CreateRequest = () => {
    const { profile: currentUserProfile } = useOutletContext();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState('');
    const [isFlexibleTime, setIsFlexibleTime] = useState(false);
    const [timeRangeEnd, setTimeRangeEnd] = useState('');
    const [seats, setSeats] = useState('1');
    const [suggestedPrice, setSuggestedPrice] = useState('');
    const [details, setDetails] = useState('');

    const handleOriginSelect = useCallback((place) => {
        if (place) setOrigin({ address: place.address, coordinates: place.coordinates });
        else setOrigin(null);
    }, []);

    const handleDestinationSelect = useCallback((place) => {
        if (place) setDestination({ address: place.address, coordinates: place.coordinates });
        else setDestination(null);
    }, []);

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const numericSeats = Number(seats);
        const priceWithDot = (suggestedPrice || '').replace(',', '.');
        const numericPrice = Number(priceWithDot);



        if (!currentUserProfile || !origin || !destination || !time || isNaN(numericSeats) || numericSeats <= 0 || isNaN(numericPrice) || numericPrice < 0) {
            if (!origin || !destination) {
                toast.error("Debes seleccionar una dirección válida de la lista desplegable.");
            } else {
                toast.error("Por favor, completa todos los campos requeridos, incluyendo una contribución sugerida.");
            }
            setIsLoading(false);
            return;
        }

        // FIX Missing #1: Validate coordinates exist
        if (!origin?.coordinates?.lat || !origin?.coordinates?.lng) {
            toast.error("Las coordenadas del origen no son válidas. Por favor, selecciona una dirección de la lista.");
            setIsLoading(false);
            return;
        }
        if (!destination?.coordinates?.lat || !destination?.coordinates?.lng) {
            toast.error("Las coordenadas del destino no son válidas. Por favor, selecciona una dirección de la lista.");
            setIsLoading(false);
            return;
        }

        const [hours, minutes] = time.split(':').map(Number);
        const rideDateTime = new Date(date);
        rideDateTime.setHours(hours, minutes, 0, 0);

        if (!isFuture(rideDateTime)) {
            toast.error("Fecha inválida", { description: "La fecha y hora de la solicitud deben ser en el futuro." });
            setIsLoading(false);
            return;
        }

        try {
            const requestData = {
                origin,
                destination,
                dateTime: rideDateTime,
                seats: numericSeats,
                suggestedPrice: numericPrice,
                details: details.trim(),
                isFlexibleTime,
                timeRangeEnd: isFlexibleTime && timeRangeEnd ? timeRangeEnd : null,
            };

            await createSingleRequest(requestData);

            toast.success('¡Solicitud de viaje enviada!', { description: 'Los conductores cercanos serán notificados.' });
            navigate('/dashboard');

        } catch (error) {
            console.error("Error al crear la solicitud:", error);
            toast.error('Error al enviar la solicitud', { description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUserProfile) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /> Cargando...</div>;

    return (
        <div className="max-w-2xl mx-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Solicitar un viaje</CardTitle>
                    <CardDescription>Completa los detalles de la ruta que necesitas. Tu solicitud será visible para los conductores.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateRequest} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Origen</label>
                                <AddressAutocomplete
                                    value={origin?.address}
                                    onChange={handleOriginSelect}
                                    placeholder="¿Desde dónde sales?"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Destino</label>
                                <AddressAutocomplete
                                    value={destination?.address}
                                    onChange={handleDestinationSelect}
                                    placeholder="¿A dónde vas?"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Fecha del viaje</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus fromDate={new Date()} />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Hora {isFlexibleTime ? '(desde)' : '(aprox.)'}</label>
                                <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="checkbox"
                                        id="flexibleTime"
                                        checked={isFlexibleTime}
                                        onChange={(e) => setIsFlexibleTime(e.target.checked)}
                                        className="h-4 w-4"
                                    />
                                    <label htmlFor="flexibleTime" className="text-sm text-muted-foreground cursor-pointer">Horario flexible</label>
                                </div>
                                {isFlexibleTime && (
                                    <div className="mt-2">
                                        <label className="block text-sm font-medium mb-1">Hasta</label>
                                        <Input id="timeEnd" type="time" value={timeRangeEnd} onChange={(e) => setTimeRangeEnd(e.target.value)} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Plazas necesarias</label>
                                <Input id="seats" type="number" value={seats} onChange={(e) => setSeats(e.target.value)} min="1" max="8" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Contribución sugerida (€)</label>
                                <Input id="price" type="text" inputMode="decimal" value={suggestedPrice} onChange={(e) => setSuggestedPrice(e.target.value)} required placeholder="ej: 10,00" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="details" className="block text-sm font-medium mb-1">Detalles adicionales (opcional)</label>
                            <Textarea id="details" placeholder="Ej: Llevo una maleta grande, tengo flexibilidad horaria..." value={details} onChange={(e) => setDetails(e.target.value)} className="h-24" />
                        </div>

                        <Button type="submit" disabled={isLoading} className="w-full h-12 text-base">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                            Enviar Solicitud
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreateRequest;
