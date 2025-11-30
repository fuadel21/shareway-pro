import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';

const RideManagementTab = () => {
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        let ridesQuery = statusFilter === 'all'
            ? query(collection(db, 'rides'), orderBy('departureTime', 'desc'))
            : query(collection(db, 'rides'), where('status', '==', statusFilter), orderBy('departureTime', 'desc'));

        const unsubscribe = onSnapshot(ridesQuery, (snapshot) => {
            setRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (error) => { toast.error("Error al cargar los viajes."); setLoading(false); });
        return () => unsubscribe();
    }, [statusFilter]);

    const getStatusBadge = (status) => {
        const styles = {
            scheduled: 'bg-blue-100 text-blue-800',
            inprogress: 'bg-yellow-100 text-yellow-800',
            completed: 'bg-green-100 text-green-800',
            canceled: 'bg-red-100 text-red-800',
        };
        return <Badge className={styles[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
    }

    return (
        <CardContent>
            <div className="mb-6">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="scheduled">Programados</SelectItem>
                        <SelectItem value="inprogress">En curso</SelectItem>
                        <SelectItem value="completed">Completados</SelectItem>
                        <SelectItem value="canceled">Cancelados</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {loading ? (
                <div className="text-center py-12"><Loader2 className="h-8 w-8 mx-auto animate-spin" /></div>
            ) : (
                <div className="space-y-4">
                    {rides.map(ride => (
                        <div key={ride.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <p className="font-semibold">{ride.origin} → {ride.destination}</p>
                                <p className="text-sm text-muted-foreground">{ride.departureTime.toDate().toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {getStatusBadge(ride.status)}
                                <Button variant="ghost" size="sm" onClick={() => navigate(`/ride/${ride.id}`)}>Ver Viaje</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
    );
};

export default RideManagementTab;
