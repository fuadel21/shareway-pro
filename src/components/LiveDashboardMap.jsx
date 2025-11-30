import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import MapComponent from './MapComponent';
// import { GoogleMap, MarkerF, Polyline } from '@react-google-maps/api';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// --- Componentes y UI (Sin cambios) ---
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Plus, Search, LocateFixed, Globe, Users, Car, List, Loader2 } from 'lucide-react';

// --- Constantes y Utils (Sin cambios) ---
const SPAIN_CENTER = { lat: 40.416775, lng: -3.703790 };
const toLatLng = (coords) => coords ? { lat: coords.latitude, lng: coords.longitude } : null;

// --- Componente ItemCard (Sin cambios) ---
const ItemCard = ({ item, navigate, isSelected, onClick }) => {
    const { origin, destination, dateTime, id, passengerUids, seatsTotal, price } = item;
    const linkTo = item.type === 'ride' ? `/ride/${id}` : `/request-details/${id}`;
    const formattedTime = dateTime?.toDate ? format(dateTime.toDate(), "HH:mm", { locale: es }) : '';
    const formattedDate = dateTime?.toDate ? format(dateTime.toDate(), "dd 'de' MMMM", { locale: es }) : 'Fecha no disp.';
    const isRide = item.type === 'ride';
    const passengersCount = passengerUids?.length || 0;

    return (
        <div
            className={cn(
                "bg-white border rounded-lg p-4 mb-3 shadow-sm cursor-pointer hover:shadow-md transition-all",
                isSelected && "border-primary shadow-lg ring-2 ring-primary"
            )}
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-lg truncate max-w-[70%]">De {origin?.address || 'N/A'}</p>
                <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-semibold",
                    item.status === 'scheduled' && "bg-blue-100 text-blue-800",
                    item.status === 'in_progress' && "bg-green-100 text-green-800"
                )}>
                    {item.status === 'scheduled' ? 'Programado' : 'En curso'}
                </span>
            </div>
            <p className="text-md text-muted-foreground -mt-1 mb-3 truncate max-w-[80%]">A {destination?.address || 'N/A'}</p>
            <div className="flex justify-between items-center text-sm">
                <p className="text-muted-foreground">{formattedDate} a las <span className="font-semibold text-foreground">{formattedTime}</span></p>
                <div className="flex items-center gap-4">
                    {isRide && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span className="font-semibold text-foreground">{passengersCount} / {seatsTotal || '-'}</span>
                        </div>
                    )}
                    <p className="font-bold text-lg text-primary">{price?.toFixed(2) || '0.00'}€</p>
                </div>
            </div>
        </div>
    );
};

function LiveDashboardMap() {
    const { user } = useOutletContext();
    const navigate = useNavigate();

    // --- Estados del Componente ---
    const [allRides, setAllRides] = useState([]);
    const [allRequests, setAllRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState('Próximos');
    const [isPanelExpanded, setIsPanelExpanded] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const [selectedItemId, setSelectedItemId] = useState(null);
    const mapRef = useRef(null);

    // --- Efecto para obtener la ubicación del usuario (sin cambios) ---
    useEffect(() => {
        if (user) {
            navigator.geolocation.getCurrentPosition(
                (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
                () => console.warn("No se pudo obtener la ubicación del usuario."),
                { enableHighAccuracy: false, timeout: 10000 }
            );
        }
    }, [user]);

    // Suscripciones a Firestore
    useEffect(() => {
        if (!user) return;

        // --- Suscripción a Viajes ---
        const ridesQuery = query(collection(db, 'rides'), where('status', 'in', ['scheduled', 'in_progress']));
        const unsubRides = onSnapshot(ridesQuery, (snapshot) => {
            const ridesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'ride' }));
            setAllRides(ridesData);
        }, (error) => {
            console.error("Error en el listener de viajes:", error);
        });

        // --- Suscripción a Solicitudes ---
        const requestsQuery = query(collection(db, 'rideRequests'), where('status', '==', 'pending'));
        const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
            const requestsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'request' }));
            setAllRequests(requestsData);
        }, (error) => {
            console.error("Error en el listener de solicitudes:", error);
        });

        return () => {
            unsubRides();
            unsubRequests();
        };

    }, [user]);

    const itemsToDisplay = useMemo(() => {
        if (!user?.uid) return [];
        let items;
        switch (activeFilter) {
            case 'Próximos':
                items = allRides.filter(r => r.driver.id !== user.uid && r.status === 'scheduled');
                break;
            case 'En curso':
                items = allRides.filter(r => r.driver.id !== user.uid && r.status === 'in_progress');
                break;
            case 'Solicitudes':
                items = allRequests.filter(req => req.requester.id !== user.uid);
                break;
            default:
                items = [
                    ...allRides.filter(r => r.driver.id !== user.uid),
                    ...allRequests.filter(req => req.requester.id !== user.uid)
                ];
                break;
        }
        return searchTerm
            ? items.filter(i => (i.origin?.address?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || (i.destination?.address?.toLowerCase() || '').includes(searchTerm.toLowerCase()))
            : items;
    }, [allRides, allRequests, searchTerm, activeFilter, user?.uid]);

    // --- Handlers ---
    const handleLocateMe = () => {
        if (userLocation && mapRef.current) {
            // Leaflet map centering would go here
        }
    };
    const handleGlobalView = () => {
        setSelectedItemId(null);
    };

    return (
        <div className="w-full h-full relative overflow-hidden">
            <MapComponent
                userLocation={userLocation}
                itemsToDisplay={itemsToDisplay.map(item => ({
                    ...item,
                    originCoords: item.origin?.coordinates,
                    destinationCoords: item.destination?.coordinates,
                    currentLocation: item.driver?.location
                }))}
            />

            {/* --- UI Superpuesta (paneles, botones, etc.) -- */}
            <div className="absolute top-[100px] right-4 flex flex-col gap-2 z-[1000]">
                <Button size="icon" onClick={handleLocateMe} title="Mi ubicación"><LocateFixed className="h-5 w-5" /></Button>
                <Button size="icon" onClick={handleGlobalView} title="Vista global"><Globe className="h-5 w-5" /></Button>
            </div>

            <div className={cn("absolute bottom-0 left-0 right-0 z-20 pt-4 bg-background rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.1)]", "transition-transform duration-300 ease-in-out", isPanelExpanded ? "translate-y-0" : "translate-y-[calc(100%-100px)]")}>
                <div className="w-full px-4 flex justify-center mb-2">
                    <div className="w-12 h-1.5 bg-muted rounded-full cursor-pointer" onClick={() => setIsPanelExpanded(!isPanelExpanded)}></div>
                </div>

                <div className="px-4 space-y-3">
                    <div className="flex gap-2">
                        <Button variant={activeFilter === 'Próximos' ? 'default' : 'outline'} onClick={() => setActiveFilter('Próximos')} className="flex-1">Próximos</Button>
                        <Button variant={activeFilter === 'En curso' ? 'default' : 'outline'} onClick={() => setActiveFilter('En curso')} className="flex-1">En curso</Button>
                        <Button variant={activeFilter === 'Solicitudes' ? 'default' : 'outline'} onClick={() => setActiveFilter('Solicitudes')} className="flex-1">Solicitudes</Button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="search" placeholder="Buscar..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <div className="h-[calc(50vh-220px)] min-h-[150px] overflow-y-auto pr-1 px-4 mt-3">
                    {itemsToDisplay.length > 0 ? itemsToDisplay.map(item => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            navigate={navigate}
                            isSelected={item.id === selectedItemId}
                            onClick={() => setSelectedItemId(item.id)}
                        />
                    )) : <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground"><Car className="w-12 h-12 mb-4" /><p>No hay viajes que coincidan.</p></div>}
                </div>
            </div>
        </div>
    );
}

export default LiveDashboardMap;
