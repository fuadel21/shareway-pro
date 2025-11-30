import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button.jsx';
import { Card } from '@/components/ui/card.jsx';
import { Users } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { RideCardSkeleton } from '@/components/ui/skeleton';

const ListItem = ({ item, navigate, isHistory }) => {
    const originAddress = item.origin?.address?.split(',')[0] || 'Origen';
    const destinationAddress = item.destination?.address?.split(',')[0] || 'Destino';
    const title = `${originAddress} → ${destinationAddress}`;
    const date = item.dateTime?.toDate ? format(item.dateTime.toDate(), "d MMM, HH:mm'h'", { locale: es }) : 'Fecha no disponible';

    const handleClick = () => {
        if (isHistory) {
            navigate(`/past-ride/${item.id}`);
        } else {
            navigate(`/ride/${item.id}`);
        }
    };

    const priceText = typeof item.price === 'number' ? `${item.price.toFixed(2)}€` : 'N/A';

    return (
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
            <div className="p-3">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-md truncate pr-2">{title}</h3>
                    <StatusBadge status={item.status} />
                </div>
                <p className="text-sm text-gray-500 mb-2 font-medium">{date}</p>
                <div className="flex justify-between items-center text-sm mt-2">
                    <div className="flex items-center text-gray-600"><Users className="h-4 w-4 mr-1.5" /> {item.passengers?.length || 0} / {item.seatsTotal || 0}</div>
                    <div className="font-bold text-md">{priceText}</div>
                </div>
            </div>
        </Card>
    );
};

const MyRides = () => {
    const { profile } = useOutletContext();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('upcoming');
    const [myRides, setMyRides] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.uid) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const ridesQuery = query(
            collection(db, 'rides'),
            where('participantIds', 'array-contains', profile.uid)
        );

        const unsubscribe = onSnapshot(ridesQuery, (snapshot) => {
            const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyRides(rides);
            setLoading(false);
        }, (error) => {
            console.error("Error al obtener los viajes:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.uid]);

    // --- INICIO DE LA CORRECCIÓN ---
    const { upcoming, history } = useMemo(() => {
        const upcoming = myRides
            .filter(ride => ['scheduled', 'in_progress'].includes(ride.status))
            .sort((a, b) => a.dateTime.toDate() - b.dateTime.toDate()); // Orden ascendente

        const history = myRides
            .filter(ride => ['completed', 'cancelled', 'expired'].includes(ride.status))
            .sort((a, b) => b.dateTime.toDate() - a.dateTime.toDate()); // Orden descendente

        return { upcoming, history };
    }, [myRides]);
    // --- FIN DE LA CORRECCIÓN ---

    const itemsToShow = activeTab === 'upcoming' ? upcoming : history;

    return (
        <div className="p-4 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Mis Viajes</h1>
            <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
                <Button variant={activeTab === 'upcoming' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('upcoming')}>Próximos</Button>
                <Button variant={activeTab === 'history' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('history')}>Historial</Button>
            </div>
            <div className="space-y-3">
                {loading ? (
                    <>
                        {[1, 2, 3, 4].map(i => <RideCardSkeleton key={i} />)}
                    </>
                ) : itemsToShow.length > 0 ? (
                    itemsToShow.map(item => <ListItem key={item.id} item={item} navigate={navigate} isHistory={activeTab === 'history'} />)
                ) : (
                    <div className="text-center py-10"><p className="text-gray-500">No hay viajes en esta sección.</p></div>
                )}
            </div>
        </div>
    );
};

export default MyRides;
