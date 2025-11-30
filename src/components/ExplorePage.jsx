import React, { useMemo, useState } from 'react';
import { useOutletContext, Link, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Clock, Calendar, Users, Handshake, ShieldCheck, Shield, Package, Box, FileText } from 'lucide-react';
import SubPageHeader from './SubPageHeader';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import MapComponent from './MapComponent';

// ... (ItemCard para Viajes y Solicitudes sin cambios)

const PackageItemCard = ({ item }) => {
    const sizeIcons = {
        small: <FileText className="h-6 w-6 text-gray-500 flex-shrink-0" />,
        medium: <Package className="h-6 w-6 text-gray-500 flex-shrink-0" />,
        large: <Box className="h-6 w-6 text-gray-500 flex-shrink-0" />
    }

    return (
        <Link to={`/package/${item.id}`}> {/* <-- Futura ruta */}
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                        {sizeIcons[item.size] || <Package className="h-6 w-6 text-gray-500 flex-shrink-0" />}
                        <div className="overflow-hidden">
                            <h3 className="font-bold truncate">{`De ${item.origin.address} a ${item.destination.address}`}</h3>
                            <p className="text-sm text-gray-500">Entregar antes del: {item.deliveryBy ? format(item.deliveryBy.toDate(), "d MMM yyyy", { locale: es }) : ''}</p>
                            <p className="text-sm mt-1">{item.description}</p>
                        </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-semibold">{item.price?.toFixed(2)}€</p>
                        <p className="text-xs text-gray-500 mt-1 capitalize">{item.size}</p>
                    </div>
                </div>
            </Card>
        </Link>
    );
}

const ExplorePage = () => {
    const outletContext = useOutletContext();
    const { rides, rideRequests, packages, loadingData, profile, userLocation } = outletContext;
    const location = useLocation();
    const [showWomenOnly, setShowWomenOnly] = useState(false);

    // Convertir rides para el mapa
    const publishedRides = useMemo(() => {
        return (rides || []).map(ride => ({
            type: 'ride',
            id: ride.id,
            status: ride.status,
            originCoords: ride.origin?.coordinates,
            destinationCoords: ride.destination?.coordinates
        }));
    }, [rides]);

    const defaultTab = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return params.get('filter') || 'upcoming';
    }, [location.search]);

    const allItems = useMemo(() => {
        // ... (lógica de filtrado de viajes y solicitudes sin cambios) ...
    }, [rides, rideRequests, showWomenOnly]);

    if (loadingData) {
        return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;
    }

    const renderList = (list, listName, component) => {
        if (list.length === 0) {
            return <div className="text-center py-16"><p className="text-gray-500">No hay nada en "{listName}" por ahora.</p></div>;
        }
        const ItemComponent = component;
        return (
            <div className="space-y-3">
                {list.map(item => <ItemComponent key={item.id} item={item} />)}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <SubPageHeader title="Explorar" />

            <div style={{ height: '400px', marginBottom: '20px' }}>
                <MapComponent
                    userLocation={userLocation}
                    itemsToDisplay={publishedRides}
                />
            </div>

            {profile?.gender === 'female' && (
                <div className="my-4 p-4 border rounded-lg bg-gray-50 flex items-center justify-between">
                    {/* ... (switch sin cambios) ... */}
                </div>
            )}

            {/* --- PESTAÑAS ACTUALIZADAS --- */}
            <Tabs defaultValue={defaultTab} className="w-full">
                <div className="overflow-x-auto pb-2 -mb-2 no-scrollbar">
                    <TabsList className="inline-grid grid-cols-5 gap-2 w-max sm:w-full"> {/* <-- 5 columnas */}
                        <TabsTrigger value="upcoming">Próximos</TabsTrigger>
                        <TabsTrigger value="ongoing">En Curso</TabsTrigger>
                        <TabsTrigger value="requests">Solicitudes</TabsTrigger>
                        <TabsTrigger value="packages">Envíos</TabsTrigger> {/* <-- Nueva pestaña */}
                        <TabsTrigger value="all">Todos</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="upcoming" className="pt-6">{renderList(allItems.upcoming, "Próximos", ItemCard)}</TabsContent>
                <TabsContent value="ongoing" className="pt-6">{renderList(allItems.ongoing, "En Curso", ItemCard)}</TabsContent>
                <TabsContent value="requests" className="pt-6">{renderList(allItems.requests, "Solicitudes", ItemCard)}</TabsContent>
                <TabsContent value="packages" className="pt-6">{renderList(packages, "Envíos", PackageItemCard)}</TabsContent> {/* <-- Nuevo contenido */}
                <TabsContent value="all" className="pt-6">{renderList(allItems.all, "Todos", ItemCard)}</TabsContent>
            </Tabs>
        </div>
    );
};

export default ExplorePage;
