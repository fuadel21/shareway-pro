import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// --- ¡RUTA DE IMPORTACIÓN CORREGIDA! ---
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase() : '?';

const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const q = query(collection(db, 'users'), orderBy('displayName'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, () => {
            toast.error("Error al cargar la lista de usuarios.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredUsers = users.filter(user =>
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="text-center py-12"><Loader2 className="h-8 w-8 mx-auto animate-spin" /></div>;
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
                <p className="text-muted-foreground mt-1">
                    Busca, visualiza y administra los usuarios de la plataforma.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Todos los Usuarios</CardTitle>
                    <CardDescription>
                        Se encontraron {filteredUsers.length} de {users.length} usuarios.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <Input
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="space-y-4">
                        {filteredUsers.length === 0 ? (
                             <p className="text-center text-muted-foreground py-12">No se encontraron usuarios.</p>
                        ) : (
                            filteredUsers.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarImage src={user.photoURL} />
                                            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{user.displayName || 'Sin nombre'}</p>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" onClick={() => navigate(`/admin/users/${user.id}`)}>
                                        Ver Perfil
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default UserManagementPage;