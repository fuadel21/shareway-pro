import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Shield, Mail, Phone, Calendar, Car, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Badge } from '@/components/ui/badge.jsx';

const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase() : '?';

function AdminUserProfile() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [createdRides, setCreatedRides] = useState([]);
    const [joinedRides, setJoinedRides] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch user data
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (!userDoc.exists()) {
                    toast.error("Usuario no encontrado.");
                    navigate('/admin');
                    return;
                }
                setUser({ id: userDoc.id, ...userDoc.data() });

                // Fetch created rides - CORREGIDO
                const createdQuery = query(collection(db, 'rides'), where('creator.id', '==', userId), orderBy('dateTime', 'desc'));
                const createdSnap = await getDocs(createdQuery);
                setCreatedRides(createdSnap.docs.map(d => ({id: d.id, ...d.data()})));

                // Fetch joined rides - CORREGIDO
                const joinedQuery = query(collection(db, 'rides'), where('passengerIds', 'array-contains', userId), orderBy('dateTime', 'desc'));
                const joinedSnap = await getDocs(joinedQuery);
                setJoinedRides(joinedSnap.docs.map(d => ({id: d.id, ...d.data()})));

            } catch (err) {
                toast.error("Error al cargar los datos del usuario.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId, navigate]);

    const getVerificationBadge = (status) => {
        switch(status) {
            case 'verified': return <Badge variant="success">Verificado</Badge>;
            case 'pending': return <Badge variant="secondary">Pendiente</Badge>;
            case 'rejected': return <Badge variant="destructive">Rechazado</Badge>;
            default: return <Badge variant="outline">No Verificado</Badge>;
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/admin')}><ArrowLeft/></Button>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12"><AvatarImage src={user.photoURL} /><AvatarFallback>{getInitials(user.displayName)}</AvatarFallback></Avatar>
                        <h1 className="text-2xl font-bold text-gray-800">{user.displayName}</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4 mt-6 max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Columna Izquierda: Info básica */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Información del Usuario</CardTitle></CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/> {user.email}</p>
                            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/> {user.phone || 'No especificado'}</p>
                            <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground"/> Miembro desde {new Date(user.createdAt?.toDate()).toLocaleDateString()}</p>
                            <p className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground"/> {getVerificationBadge(user.verification?.status)}</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Valoraciones</CardTitle></CardHeader>
                        <CardContent className="flex items-center justify-center gap-2 text-2xl font-bold">
                           <Star className="h-6 w-6 text-yellow-400 fill-yellow-400"/> {user.rating?.toFixed(1) || 'N/A'} <span className="text-sm font-normal text-muted-foreground">({user.reviewCount || 0} reseñas)</span>
                        </CardContent>
                    </Card>
                </div>

                {/* Columna Derecha: Actividad */}
                <div className="md:col-span-2 space-y-6">
                     <Card>
                        <CardHeader><CardTitle>Viajes Creados ({createdRides.length})</CardTitle></CardHeader>
                        <CardContent>
                            {createdRides.length > 0 ? (
                                <ul className="space-y-2">{createdRides.map(r => <li key={r.id} className="text-sm p-2 border-b last:border-b-0">{r.origin} a {r.destination}</li>)}</ul>
                            ) : <p className="text-sm text-muted-foreground">No ha creado viajes.</p>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Viajes Participados ({joinedRides.length})</CardTitle></CardHeader>
                         <CardContent>
                            {joinedRides.length > 0 ? (
                                <ul className="space-y-2">{joinedRides.map(r => <li key={r.id} className="text-sm p-2 border-b last:border-b-0">{r.origin} a {r.destination}</li>)}</ul>
                            ) : <p className="text-sm text-muted-foreground">No ha participado en viajes.</p>}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

export default AdminUserProfile;
