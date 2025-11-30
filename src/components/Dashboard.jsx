
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import MapComponent from './MapComponent';
// import { GoogleMap, MarkerF, Polyline } from '@react-google-maps/api';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Plus, Search, LocateFixed, Globe, Users, Car, List, MapPin, Calendar, Clock, Filter, Star, ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { RideCardSkeleton, DashboardSkeleton } from '@/components/ui/skeleton';

const mapContainerStyle = { height: '100%', width: '100%' };
const mapOptions = { disableDefaultUI: true, zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: false, zoomControlOptions: { position: 3 } };
const SPAIN_CENTER = { lat: 40.416775, lng: -3.703790 };

// Componente ItemCard (sin cambios)
const ItemCard = ({ item, navigate }) => {
    const { origin, destination, dateTime, id, passengerUids, seatsTotal, price, type, isFreeRide } = item;
    const linkTo = type === 'request' ? `/request-details/${id}` : `/ride/${id}`;
    const formattedTime = dateTime?.toDate ? format(dateTime.toDate(), "HH:mm", { locale: es }) : '';
    const formattedDate = dateTime?.toDate ? format(dateTime.toDate(), "dd 'de' MMMM", { locale: es }) : 'Fecha no disp.';
    const passengersCount = passengerUids?.length || 0;

    // FIX: Proper price display - show "Gratis" only for free rides, not undefined prices
    const priceDisplay = isFreeRide || price === 0 ? 'Gratis' : (typeof price === 'number' ? `${price.toFixed(2)}€` : 'N/A');

    return (
        <div className="bg-white border rounded-lg p-4 mb-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(linkTo)}>
            <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-lg truncate max-w-[70%]">De {origin?.address || 'N/A'}</p>
                <StatusBadge status={item.status || 'scheduled'} />
            </div>
            <p className="text-md text-muted-foreground -mt-1 mb-3 truncate max-w-[80%]">A {destination?.address || 'N/A'}</p>
            <div className="flex justify-between items-center text-sm">
                <p className="text-muted-foreground">{formattedDate} a las <span className="font-semibold text-foreground">{formattedTime}</span></p>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="font-semibold text-foreground">{passengersCount} / {seatsTotal || '-'}</span>
                    </div>
                    <p className="font-bold text-lg text-primary">{priceDisplay}</p>
                </div>
            </div>
        </div>
    );
};

function Dashboard() {
    const { user, profile } = useOutletContext();
    const navigate = useNavigate();

    const [allPublicRides, setAllPublicRides] = useState([]);
    const [allPublicRequests, setAllPublicRequests] = useState([]);
    const [compatibleRequests, setCompatibleRequests] = useState([]);
    // const [decodedPaths, setDecodedPaths] = useState({}); // Removed - not needed with Leaflet
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // 'all', 'community', 'public'
    const [favoriteRoutes, setFavoriteRoutes] = useState([]);
    const [activeFilter, setActiveFilter] = useState('Próximos');
    const [sortBy, setSortBy] = useState('date'); // 'date', 'price', 'distance'
    const [isPanelExpanded, setIsPanelExpanded] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const mapRef = useRef(null);

    useEffect(() => {
        if (user) {
            navigator.geolocation.getCurrentPosition(
                (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
                () => console.warn("No se pudo obtener la ubicación del usuario."),
                { timeout: 10000 }
            );
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const processRides = (docs) => {
            const ridesData = docs.map(d => ({ ...d.data(), id: d.id, type: 'ride' }));
            setAllPublicRides(ridesData);
            // Polyline decoding removed - using Leaflet now
        };

        // FIX: Only show active rides (scheduled, active, in_progress)
        // Exclude 'expired', 'cancelled', and 'completed' to avoid confusing messages
        const ridesQuery = query(
            collection(db, 'rides'),
            where('status', 'in', ['scheduled', 'active', 'in_progress'])
        );
        const unsubRides = onSnapshot(ridesQuery, (snap) => processRides(snap.docs), (error) => console.error("Ride listener error:", error));

        const requestsQuery = query(collection(db, 'rideRequests'), where('status', '==', 'pending'));
        const unsubRequests = onSnapshot(requestsQuery, (snap) => setAllPublicRequests(snap.docs.map(d => ({ ...d.data(), id: d.id, type: 'request' }))));

        return () => {
            unsubRides();
            unsubRequests();
        };
    }, [user]);

    // Cargar rutas favoritas (limitado a 3 para el dashboard)
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'favoriteRoutes'),
            where('userId', '==', user.uid),
            limit(3)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setFavoriteRoutes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [user]);

    const filteredRides = useMemo(() => {
        if (!user) return [];
        let items;
        switch (activeFilter) {
            case 'Próximos':
                items = allPublicRides.filter(r => r.status === 'scheduled');
                break;
            case 'En curso':
                items = allPublicRides.filter(r => r.status === 'in_progress');
                break;
            case 'Solicitudes':
                items = allPublicRequests;
                break;
            default:
                items = [...allPublicRides, ...allPublicRequests];
        }

        // FIX: Filter out user's own rides from dashboard
        items = items.filter(item => {
            // Don't show rides where user is the driver
            if (item.type === 'ride' && item.driver?.id === user.uid) {
                return false;
            }
            // Don't show requests created by the user
            if (item.type === 'request' && item.requester?.id === user.uid) {
                return false;
            }
            return true;
        });

        // Filtrar viajes exclusivos de comunidad
        items = items.filter(item => {
            // Si el viaje/solicitud es exclusivo
            if (item.isExclusive && item.exclusiveToCommunityId) {
                // Solo mostrar si el usuario pertenece a la misma comunidad
                return profile?.communityId === item.exclusiveToCommunityId;
            }
            // Viajes públicos siempre visibles
            return true;
        });

        // Aplicar búsqueda
        if (searchTerm) {
            items = items.filter(i => (i.origin?.address?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || (i.destination?.address?.toLowerCase() || '').includes(searchTerm.toLowerCase()));
        }

        // Aplicar ordenación
        items.sort((a, b) => {
            if (sortBy === 'price') {
                return (a.price || 0) - (b.price || 0);
            } else if (sortBy === 'distance') {
                return (a.distance || 0) - (b.distance || 0);
            } else { // 'date'
                const dateA = a.dateTime?.toDate?.() || new Date(0);
                const dateB = b.dateTime?.toDate?.() || new Date(0);
                return dateA - dateB;
            }
        });

        return items;
    }, [allPublicRides, allPublicRequests, searchTerm, activeFilter, sortBy, user, profile]);

    const onMapLoad = useCallback((map) => (mapRef.current = map), []);
    const handleLocateMe = () => { if (userLocation && mapRef.current) { mapRef.current.panTo(userLocation); mapRef.current.setZoom(14); } };
    const handleGlobalView = () => { if (mapRef.current) { mapRef.current.panTo(SPAIN_CENTER); mapRef.current.setZoom(6); } };

    // if (mapsLoadError) return <div className="h-full w-full flex items-center justify-center text-red-500">Error al cargar los mapas.</div>;

    // Show skeleton while loading
    if (!user) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="w-full h-[calc(100vh-140px)] relative overflow-hidden flex flex-col md:flex-row">
            {/* Sidebar / Panel Container */}
            <div className={cn(
                "absolute md:relative z-20 bg-background shadow-xl transition-all duration-300 ease-in-out",
                // Mobile styles: Bottom sheet
                "bottom-0 left-0 right-0 rounded-t-2xl md:rounded-none",
                isPanelExpanded ? "translate-y-0" : "translate-y-[calc(100%-100px)] md:translate-y-0",
                // Desktop styles: Left sidebar
                "md:w-[400px] md:h-full md:border-r md:shadow-none md:inset-auto"
            )}>
                {/* Mobile Drag Handle */}
                <div className="w-full px-4 md:hidden flex justify-center">
                    <div className="w-12 h-1.5 bg-muted rounded-full cursor-pointer mt-4 mb-2" onClick={() => setIsPanelExpanded(!isPanelExpanded)}></div>
                </div>

                <div className="px-4 pt-2 md:pt-6 space-y-4 h-full flex flex-col">
                    <div className="flex gap-4 mb-6">
                        <Button onClick={() => navigate('/create-ride')} className="flex-1 h-12 text-lg shadow-md bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary">
                            <Plus className="mr-2 h-5 w-5" /> Publicar Viaje
                        </Button>
                        <Button onClick={() => navigate('/create-request')} variant="secondary" className="flex-1 h-12 text-lg shadow-sm border-2 border-primary/10">
                            <Search className="mr-2 h-5 w-5" /> Solicitar Viaje
                        </Button>
                    </div>

                    {/* Rutas Rápidas */}
                    {favoriteRoutes.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                    Rutas Rápidas
                                </h2>
                                <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate('/favorite-routes')}>
                                    Ver todas <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                            <div className="grid gap-3">
                                {favoriteRoutes.map(route => (
                                    <div
                                        key={route.id}
                                        onClick={() => navigate('/create-ride', { state: { favoriteRoute: route } })}
                                        className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full flex-shrink-0">
                                                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold truncate">{route.name}</h3>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {route.origin.address.split(',')[0]} → {route.destination.address.split(',')[0]}
                                                </p>
                                            </div>
                                        </div>
                                        <Plus className="h-5 w-5 text-primary flex-shrink-0" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-muted-foreground">Ordenar:</label>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
                                <option value="date">Más pronto</option>
                                <option value="price">Más barato</option>
                                <option value="distance">Más cercano</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <Button
                                variant={activeFilter === 'Próximos' ? 'secondary' : 'ghost'}
                                className="flex-1 justify-start font-normal"
                                onClick={() => {
                                    console.log('Próximos clicked');
                                    setActiveFilter('Próximos');
                                }}
                            >
                                <Car className="mr-3 h-4 w-4 text-muted-foreground" />Próximos
                            </Button>
                            <Button
                                variant={activeFilter === 'En curso' ? 'secondary' : 'ghost'}
                                className="flex-1 justify-start font-normal"
                                onClick={() => {
                                    console.log('En curso clicked, current filter:', activeFilter);
                                    setActiveFilter('En curso');
                                    console.log('Filter set to: En curso');
                                }}
                            >
                                <Car className="mr-3 h-4 w-4 text-muted-foreground" />En curso
                            </Button>
                            <Button
                                variant={activeFilter === 'Solicitudes' ? 'secondary' : 'ghost'}
                                className="flex-1 justify-start font-normal"
                                onClick={() => {
                                    console.log('Solicitudes clicked');
                                    setActiveFilter('Solicitudes');
                                }}
                            >
                                <Users className="mr-3 h-4 w-4 text-muted-foreground" />Solicitudes
                            </Button>
                            <Button
                                variant={activeFilter === 'Todos' ? 'secondary' : 'ghost'}
                                className="flex-1 justify-start font-normal"
                                onClick={() => {
                                    console.log('Todos clicked');
                                    setActiveFilter('Todos');
                                }}
                            >
                                <List className="mr-3 h-4 w-4 text-muted-foreground" />Todos
                            </Button>
                        </div>
                        <div className="relative mt-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input type="search" placeholder="Buscar en la lista..." className="pl-10 h-12 text-base" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-1 pb-20 md:pb-4">
                        {filteredRides.length > 0 ? filteredRides.map(item => <ItemCard key={item.id} item={item} navigate={navigate} />) : <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground"><Car className="w-12 h-12 mb-4" /><p>No hay viajes que coincidan.</p></div>}
                    </div>
                </div>
            </div>

            {/* Map Container */}
            <div className="w-full h-full relative flex-1">
                <MapComponent
                    userLocation={userLocation}
                    itemsToDisplay={filteredRides.map(r => ({
                        ...r,
                        originCoords: r.origin?.coordinates,
                        destinationCoords: r.destination?.coordinates,
                        currentLocation: r.driver?.location
                    }))}
                />

                <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
                    <Button size="icon" onClick={handleLocateMe} title="Mi ubicación"><LocateFixed className="h-5 w-5" /></Button>
                    <Button size="icon" onClick={handleGlobalView} title="Vista global"><Globe className="h-5 w-5" /></Button>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;