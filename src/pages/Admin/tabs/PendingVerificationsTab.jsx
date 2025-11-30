import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';

const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase() : '?';

const PendingVerificationsTab = () => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const q = query(collection(db, 'users'), where('verification.status', '==', 'pending'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPendingUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, () => { toast.error("Error al cargar usuarios pendientes."); setLoading(false); });
        return () => unsubscribe();
    }, []);

    if (loading) return <div className="text-center py-12"><Loader2 className="h-8 w-8 mx-auto animate-spin" /></div>;

    return (
        <CardContent>
            {pendingUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No hay usuarios pendientes de verificación.</p>
            ) : (
                <div className="space-y-4">
                    {pendingUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-4">
                                <Avatar><AvatarImage src={user.photoURL} /><AvatarFallback>{getInitials(user.displayName)}</AvatarFallback></Avatar>
                                <div>
                                    <p className="font-semibold">{user.displayName}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                            </div>
                            <Button variant="outline" onClick={() => navigate(`/admin/review/${user.id}`)}>Revisar</Button>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
    );
};

export default PendingVerificationsTab;
