import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import SubPageHeader from './SubPageHeader';

const FavoriteRoutes = () => {
    const { user } = useOutletContext();
    const navigate = useNavigate();
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'favoriteRoutes'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const routesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRoutes(routesData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleCreateRideFromRoute = (route) => {
        // Navegar a CreateRide con datos pre-rellenados
        navigate('/create-ride', {
            state: {
                favoriteRoute: route
            }
        });
    };

    const handleDeleteRoute = async (routeId) => {
        if (!confirm('¿Eliminar esta ruta favorita?')) return;

        try {
            await deleteDoc(doc(db, 'favoriteRoutes', routeId));
            toast.success('Ruta eliminada');
        } catch (error) {
            toast.error('Error al eliminar ruta');
        }
    };

    if (!user) {
        return <div className="h-screen flex items-center justify-center">Cargando...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <SubPageHeader title="Mis Rutas Favoritas" />
            <main className="container mx-auto p-4 max-w-4xl pb-12">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : routes.length === 0 ? (
                    <Card>
                        <CardContent className="text-center py-12">
                            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground font-medium">No tienes rutas favoritas aún</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Crea un viaje y márcalo como favorito para verlo aquí
                            </p>
                            <Button className="mt-4" onClick={() => navigate('/create-ride')}>
                                <Plus className="mr-2 h-4 w-4" />
                                Crear Primer Viaje
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {routes.map(route => (
                            <Card key={route.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span className="text-lg">{route.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteRoute(route.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {/* Ruta */}
                                        <div className="flex items-start gap-2">
                                            <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium">Origen</p>
                                                <p className="text-sm text-muted-foreground truncate">{route.origin.address}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Navigation className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium">Destino</p>
                                                <p className="text-sm text-muted-foreground truncate">{route.destination.address}</p>
                                            </div>
                                        </div>

                                        {/* Estadísticas */}
                                        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                                            <span>Usado {route.timesUsed || 1} {route.timesUsed === 1 ? 'vez' : 'veces'}</span>
                                            {route.distance && <span>{route.distance.toFixed(1)} km</span>}
                                        </div>

                                        {/* Acción */}
                                        <Button
                                            className="w-full"
                                            onClick={() => handleCreateRideFromRoute(route)}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Crear Viaje con esta Ruta
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default FavoriteRoutes;
