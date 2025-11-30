import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, startAt, endAt, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, Search } from 'lucide-react';
import { CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';

const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase() : '?';

const UserManagementTab = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        const usersRef = collection(db, 'users');
        let q = searchTerm
            ? query(usersRef, orderBy('displayName_lowercase'), startAt(searchTerm.toLowerCase()), endAt(searchTerm.toLowerCase() + '\uf8ff'))
            : query(usersRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, () => { toast.error("Error al cargar usuarios."); setLoading(false); });
        return () => unsubscribe();
    }, [searchTerm]);
    
    const getVerificationBadge = (status) => {
        const variants = { verified: "success", pending: "secondary", rejected: "destructive" };
        const text = { verified: "Verificado", pending: "Pendiente", rejected: "Rechazado" };
        return <Badge variant={variants[status] || 'outline'}>{text[status] || 'No Verificado'}</Badge>;
    }

    return (
        <CardContent>
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Buscar por nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10"/>
            </div>
            {loading ? <div className="text-center py-12"><Loader2 className="h-8 w-8 mx-auto animate-spin" /></div> : (
                <div className="space-y-4">
                    {users.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-4">
                                <Avatar><AvatarImage src={user.photoURL} /><AvatarFallback>{getInitials(user.displayName)}</AvatarFallback></Avatar>
                                <div>
                                    <p className="font-semibold">{user.displayName}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {getVerificationBadge(user.verification?.status)}
                                <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/user/${user.id}`)}>Ver Detalles</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
    );
};

export default UserManagementTab;
