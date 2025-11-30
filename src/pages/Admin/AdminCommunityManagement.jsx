import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, orderBy, query, doc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2 } from 'lucide-react';

const AdminCommunityManagement = () => {
    const [communities, setCommunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [newCommunity, setNewCommunity] = useState({ name: '', domain: '' });

    useEffect(() => {
        const q = query(collection(db, 'communities'), orderBy('name', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const communitiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCommunities(communitiesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching communities: ", error);
            toast.error("No se pudo cargar la lista de comunidades.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewCommunity(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newCommunity.name || !newCommunity.domain) {
            toast.error("Ambos campos, nombre y dominio, son obligatorios.");
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'communities'), {
                name: newCommunity.name,
                allowedDomain: newCommunity.domain.toLowerCase(),
            });
            toast.success(`¡Comunidad \"${newCommunity.name}\" creada!`);
            setNewCommunity({ name: '', domain: '' });
        } catch (error) {
            console.error("Error creating community: ", error);
            toast.error("Error al crear la comunidad.", { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (communityId, communityName) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar la comunidad \"${communityName}\"? Esta acción no se puede deshacer.`)) {
            return;
        }
        setDeletingId(communityId);
        try {
            await deleteDoc(doc(db, 'communities', communityId));
            toast.success("Comunidad eliminada con éxito.");
        } catch (error) {
            console.error("Error deleting community: ", error);
            toast.error("Error al eliminar la comunidad.", { description: error.message });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-bold">Gestión de Comunidades</h1>

            {/* --- FORMULARIO DE CREACIÓN RESTAURADO --- */}
            <Card>
                <CardHeader>
                    <CardTitle>Crear Nueva Comunidad</CardTitle>
                    <CardDescription>Añade una nueva comunidad para que los usuarios puedan unirse.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre de la Comunidad</Label>
                                <Input 
                                    id="name"
                                    name="name"
                                    value={newCommunity.name}
                                    onChange={handleInputChange}
                                    placeholder="Ej: ACME Corporation"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="domain">Dominio de Email</Label>
                                <Input 
                                    id="domain"
                                    name="domain"
                                    value={newCommunity.domain}
                                    onChange={handleInputChange}
                                    placeholder="ej: acme.com"
                                />
                            </div>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                                Crear Comunidad
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* --- LISTA DE COMUNIDADES CON BOTÓN DE BORRADO --- */}
            <Card>
                <CardHeader>
                    <CardTitle>Comunidades Existentes</CardTitle>
                    <CardDescription>Lista de todas las comunidades actualmente en el sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                    ) : (
                        <div className="divide-y">
                            {communities.length > 0 ? communities.map(community => (
                                <div key={community.id} className="py-3 flex justify-between items-center">
                                    <div>
                                        <span className="font-medium">{community.name}</span>
                                        <span className="ml-4 text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded-md">@{community.allowedDomain}</span>
                                    </div>
                                    <Button 
                                        variant="destructive" 
                                        size="icon" 
                                        onClick={() => handleDelete(community.id, community.name)}
                                        disabled={deletingId === community.id}
                                    >
                                        {deletingId === community.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </div>
                            )) : (
                                <p className="text-center text-gray-500 py-8">No hay comunidades creadas todavía.</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminCommunityManagement;
