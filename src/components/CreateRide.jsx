import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useOutletContext, useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, CalendarIcon, CheckCircle, ShieldCheck, Star, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import AddressAutocomplete from './AddressAutocomplete.jsx';
import RideRouteMap from './RideRouteMap.jsx';
import { saveFavoriteRoute } from '../services/rideService.js';
import { getRoute } from '../services/routingService.js';
import { cn } from '@/lib/utils';

const getNextHalfHour = () => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
    if (now <= new Date()) now.setMinutes(now.getMinutes() + 30);
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

// Helper to normalize coordinates from different sources into an array [lat, lng]
const normalizeCoords = (coords) => {
    if (!coords) return null;
    // Handle Firestore GeoPoint
    if (typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
        return [coords.latitude, coords.longitude];
    }
    // Handle array [lat, lng]
    if (Array.isArray(coords) && coords.length === 2) {
        return coords;
    }
    return null;
};

const CreateRide = () => {
    const { profile: currentUserProfile } = useOutletContext();
    const navigate = useNavigate();
    const location = useLocation();

    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState(getNextHalfHour);
    const [seats, setSeats] = useState(2);
    const [price, setPrice] = useState(0);
    const [suggestedPrice, setSuggestedPrice] = useState(0);
    const [isPriceCustom, setIsPriceCustom] = useState(false);
    const [isFreeRide, setIsFreeRide] = useState(false);
    const [details, setDetails] = useState('');
    const [isExclusiveToCommunity, setIsExclusiveToCommunity] = useState(false);
    const [saveAsFavorite, setSaveAsFavorite] = useState(false);
    const [routeName, setRouteName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

    const routeDataRef = useRef(null);
    const favoriteRouteRef = useRef(location.state?.favoriteRoute);

    useEffect(() => {
        const favoriteRoute = favoriteRouteRef.current;
        if (favoriteRoute) {
            setOrigin(favoriteRoute.origin);
            setDestination(favoriteRoute.destination);
            setRouteName(favoriteRoute.name);
        }
    }, []);

    const handleOriginSelect = useCallback((place) => {
        setOrigin(place ? { address: place.address, coordinates: place.coordinates } : null);
    }, []);

    const handleDestinationSelect = useCallback((place) => {
        setDestination(place ? { address: place.address, coordinates: place.coordinates } : null);
    }, []);

    useEffect(() => {
        const calculateRoute = async () => {
            if (origin && destination) {
                const originCoords = normalizeCoords(origin.coordinates);
                const destCoords = normalizeCoords(destination.coordinates);

                if (!originCoords || !destCoords) {
                    return;
                }

                setIsCalculatingRoute(true);
                try {
                    const routeResult = await getRoute(originCoords, destCoords);
                    if (routeResult) {
                        const distanceInKm = routeResult.distance / 1000;
                        const calculatedPrice = Math.max(2.00, 1.00 + distanceInKm * 0.50);
                        setSuggestedPrice(calculatedPrice);

                        if (!isPriceCustom && !isFreeRide) {
                            setPrice(calculatedPrice);
                        }
                        
                        routeDataRef.current = {
                            distance: distanceInKm,
                            duration: routeResult.duration,
                            routeResult: routeResult, // Store raw result to be formatted on save
                        };

                    } else {
                        routeDataRef.current = null;
                        setPrice(0);
                        toast.error('No se pudo calcular la ruta.');
                    }
                } catch (error) {
                    console.error("Error calculating route:", error);
                    toast.error('Error al calcular la ruta.');
                    routeDataRef.current = null;
                } finally {
                    setIsCalculatingRoute(false);
                }
            } else {
                routeDataRef.current = null;
                setPrice(0);
            }
        };
        calculateRoute();
    }, [origin, destination, isPriceCustom, isFreeRide]);

    const handleCreateRide = async (e) => {
        e.preventDefault();
        if (!currentUserProfile?.uid) return toast.error("Debes iniciar sesión para publicar.");
        if (!origin || !destination || !routeDataRef.current) return toast.error("Selecciona un origen y destino válidos.");
        
        const originCoords = normalizeCoords(origin.coordinates);
        const destCoords = normalizeCoords(destination.coordinates);

        if (!originCoords || !destCoords) return toast.error("Las coordenadas de origen o destino no son válidas.");
        if (!date || !time) return toast.error("Especifica una fecha y hora de salida.");

        const [hours, minutes] = time.split(':').map(Number);
        const rideDateTime = new Date(date);
        rideDateTime.setHours(hours, minutes, 0, 0);

        if (rideDateTime < new Date()) return toast.error("La fecha de salida no puede ser en el pasado.");

        const numericSeats = Number(seats);
        if (isNaN(numericSeats) || numericSeats <= 0) return toast.error("El número de asientos no es válido.");

        let finalPrice = isFreeRide ? 0 : price;
        if (!isFreeRide) {
            if (isNaN(finalPrice) || finalPrice < 0) return toast.error("El precio no es válido.");
            if (isPriceCustom && suggestedPrice > 0 && finalPrice > suggestedPrice * 1.5) {
                return toast.error(`El precio no puede exceder ${(suggestedPrice * 1.5).toFixed(2)}€.`);
            }
        }

        if (details.trim().length > 500) return toast.error("Los detalles no pueden exceder 500 caracteres.");

        setIsSubmitting(true);
        try {
            const { routeResult } = routeDataRef.current;

            const rideDoc = {
                status: 'scheduled',
                createdAt: serverTimestamp(),
                origin: {
                    address: origin.address,
                    coordinates: new GeoPoint(originCoords[0], originCoords[1])
                },
                destination: {
                    address: destination.address,
                    coordinates: new GeoPoint(destCoords[0], destCoords[1])
                },
                dateTime: rideDateTime,
                distance: routeDataRef.current.distance,
                duration: routeDataRef.current.duration,
                bounds: {
                    ne: new GeoPoint(routeResult.bounds[1][0], routeResult.bounds[1][1]),
                    sw: new GeoPoint(routeResult.bounds[0][0], routeResult.bounds[0][1])
                },
                routeCoordinates: routeResult.coordinates.map(coord => new GeoPoint(coord[0], coord[1])),
                driver: {
                    id: currentUserProfile.uid,
                    displayName: currentUserProfile.displayName,
                    photoURL: currentUserProfile.photoURL || null,
                },
                passengers: [],
                passengerUids: [],
                seatsTotal: numericSeats,
                seatsAvailable: numericSeats,
                price: finalPrice,
                isFreeRide: isFreeRide,
                details: details.trim(),
                isExclusive: isExclusiveToCommunity,
                exclusiveToCommunityId: isExclusiveToCommunity ? currentUserProfile.communityId : null,
                exclusiveToCommunityName: isExclusiveToCommunity ? currentUserProfile.communityName : null,
            };

            await addDoc(collection(db, 'rides'), rideDoc);

            if (saveAsFavorite && routeName.trim()) {
                try {
                    const favRouteData = {
                        name: routeName.trim(),
                        origin: rideDoc.origin,
                        destination: rideDoc.destination,
                        distance: rideDoc.distance,
                    };
                    await saveFavoriteRoute(favRouteData);
                    toast.success('Ruta guardada como favorita');
                } catch (error) {
                    console.error('Error saving favorite route:', error);
                    toast.error('No se pudo guardar la ruta favorita', { description: error.message });
                }
            }

            toast.success('¡Viaje publicado con éxito!');
            navigate('/my-rides');

        } catch (error) {
            console.error("Error al publicar el viaje:", error);
            toast.error('Error al publicar el viaje', { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!currentUserProfile) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /> Cargando...</div>;

    return (
        <div className="max-w-2xl mx-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Publicar un nuevo viaje</CardTitle>
                    <CardDescription>Completa los detalles de tu ruta para que otros puedan unirse.</CardDescription>
                </CardHeader>
                <CardContent>
                    {!currentUserProfile?.phoneVerified && (
                        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-orange-800">Verifica tu teléfono</h4>
                                <p className="text-sm text-orange-700 mb-2">Para aumentar la confianza, te recomendamos verificar tu número de teléfono.</p>
                                <Link to="/settings/verification"><Button variant="outline" size="sm">Verificar ahora</Button></Link>
                            </div>
                        </div>
                    )}
                    <form onSubmit={handleCreateRide} className="space-y-6">
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium mb-1">Origen</label><AddressAutocomplete value={origin?.address} onChange={handleOriginSelect} placeholder="Lugar de salida" /></div>
                            <div><label className="block text-sm font-medium mb-1">Destino</label><AddressAutocomplete value={destination?.address} onChange={handleDestinationSelect} placeholder="Lugar de llegada" /></div>
                        </div>

                        {(origin || destination) && (
                            <div className="h-64 w-full bg-gray-200 rounded-lg overflow-hidden mt-4 relative">
                                {isCalculatingRoute && (
                                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                                )}
                                <RideRouteMap origin={origin?.coordinates} destination={destination?.coordinates} status="scheduled" />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Fecha de salida</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus fromDate={new Date()} /></PopoverContent>
                                </Popover>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Hora</label><Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required /></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium mb-1">Asientos disponibles</label><Input id="seats" type="number" value={seats} onChange={(e) => setSeats(Number(e.target.value))} min="1" max="8" required /></div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium mb-1">Precio por asiento (€)</label>
                                <div className="flex items-center gap-2 mb-2">
                                    <input type="checkbox" id="freeRide" checked={isFreeRide} onChange={(e) => { const isChecked = e.target.checked; setIsFreeRide(isChecked); if (isChecked) { setPrice(0); setIsPriceCustom(false); } else { setPrice(suggestedPrice); } }} className="h-4 w-4" />
                                    <label htmlFor="freeRide" className="text-sm text-muted-foreground cursor-pointer">Viaje gratuito</label>
                                </div>
                                {!isFreeRide && (
                                    <>
                                        {isCalculatingRoute ? (
                                            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200"><Loader2 className="h-4 w-4 animate-spin text-blue-600" /><span className="text-sm text-blue-700">Calculando precio...</span></div>
                                        ) : suggestedPrice > 0 ? (
                                            <>
                                                <div className="relative">
                                                    <Input id="price" type="number" value={price.toFixed(2)} onChange={(e) => { setPrice(parseFloat(e.target.value) || 0); setIsPriceCustom(true); }} placeholder="0.00" min="0" step="0.50" />
                                                    {!isPriceCustom && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded">Sugerido</div>}
                                                </div>
                                                {suggestedPrice > 0 && (
                                                    <div className="flex items-center justify-between text-xs">
                                                        {isPriceCustom ? (
                                                            <p className="text-muted-foreground">
                                                                Sugerido: <span className="font-semibold text-green-600">{suggestedPrice.toFixed(2)}€</span>{' '}
                                                                <button type="button" onClick={() => { setPrice(suggestedPrice); setIsPriceCustom(false); }} className="text-primary underline hover:text-primary/80">Usar sugerido</button>
                                                            </p>
                                                        ) : <p className="text-green-600 font-medium">✓ Precio calculado automáticamente</p>}
                                                    </div>
                                                )}
                                            </>
                                        ) : <div className="p-3 bg-gray-50 rounded-md border border-gray-200"><p className="text-sm text-muted-foreground">Selecciona origen y destino para calcular el precio</p></div>}
                                    </>
                                )}
                            </div>
                        </div>

                        {currentUserProfile?.communityId && (
                            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <input type="checkbox" id="exclusiveToCommunity" checked={isExclusiveToCommunity} onChange={(e) => setIsExclusiveToCommunity(e.target.checked)} className="h-4 w-4" />
                                <label htmlFor="exclusiveToCommunity" className="text-sm font-medium cursor-pointer flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-600" />Solo para miembros de {currentUserProfile.communityName}</label>
                            </div>
                        )}

                        <div><label htmlFor="details" className="block text-sm font-medium mb-1">Detalles adicionales (opcional)</label><Textarea id="details" placeholder="Ej: Solo equipaje de mano..." value={details} onChange={(e) => setDetails(e.target.value)} /></div>

                        <div className="space-y-3 pt-2 border-t">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="saveAsFavorite" checked={saveAsFavorite} onChange={(e) => setSaveAsFavorite(e.target.checked)} className="h-4 w-4 rounded" />
                                <label htmlFor="saveAsFavorite" className="text-sm font-medium cursor-pointer flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" />Guardar esta ruta como favorita</label>
                            </div>
                            {saveAsFavorite && <Input placeholder="Nombre de la ruta (ej: Casa → Trabajo)" value={routeName} onChange={(e) => setRouteName(e.target.value)} className="mt-2" />}
                        </div>

                        <Button type="submit" disabled={isSubmitting || !routeDataRef.current || isCalculatingRoute} className="w-full h-12 text-base">
                            {isSubmitting || isCalculatingRoute ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                            {isCalculatingRoute ? 'Calculando ruta...' : (isSubmitting ? 'Publicando...' : 'Publicar Viaje')}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreateRide;
