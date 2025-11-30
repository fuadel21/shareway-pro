import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { ArrowLeft, Plus, Trash2, Loader2, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc, onSnapshot, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';

function EmergencyContacts() {
    const navigate = useNavigate();
    const [user, setUser] = useState(auth.currentUser);
    const [contacts, setContacts] = useState([]);
    const [newContact, setNewContact] = useState({ name: '', phone: '' });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        const contactsColRef = collection(db, 'users', user.uid, 'emergency_contacts');
        const unsubscribe = onSnapshot(contactsColRef, (snapshot) => {
            const contactsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setContacts(contactsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, navigate]);

    const handleAddContact = async (e) => {
        e.preventDefault();
        if (!newContact.name.trim() || !newContact.phone.trim()) {
            return toast.error("El nombre y el teléfono son obligatorios.");
        }
        if (contacts.length >= 5) {
            return toast.error("Puedes añadir un máximo de 5 contactos de emergencia.");
        }

        setIsSaving(true);
        try {
            const contactsColRef = collection(db, 'users', user.uid, 'emergency_contacts');
            await addDoc(contactsColRef, newContact);
            setNewContact({ name: '', phone: '' });
            toast.success("Contacto añadido correctamente.");
        } catch (error) {
            toast.error("No se pudo añadir el contacto.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteContact = async (contactId) => {
        const contactRef = doc(db, 'users', user.uid, 'emergency_contacts', contactId);
        try {
            await deleteDoc(contactRef);
            toast.success("Contacto eliminado.");
        } catch (error) {
            toast.error("No se pudo eliminar el contacto.");
        }
    };

    if (loading) {
        return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8"/></div>;
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="bg-card border-b sticky top-0 z-10">
                <div className="container mx-auto p-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft /></Button>
                    <h1 className="text-xl font-bold">Contactos de Emergencia</h1>
                </div>
            </header>

            <main className="container mx-auto p-4 max-w-2xl space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Añadir Nuevo Contacto</CardTitle>
                        <CardDescription>Añade hasta 5 personas de confianza. Les notificaremos si activas una alerta de seguridad.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddContact} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre</Label>
                                <Input id="name" value={newContact.name} onChange={(e) => setNewContact({...newContact, name: e.target.value})} placeholder="Ej: Mamá" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input id="phone" type="tel" value={newContact.phone} onChange={(e) => setNewContact({...newContact, phone: e.target.value})} placeholder="+34 600 00 00 00" />
                            </div>
                            <Button type="submit" disabled={isSaving || contacts.length >= 5}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Añadir Contacto
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Tus Contactos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {contacts.length > 0 ? (
                            <ul className="space-y-4">
                                {contacts.map(contact => (
                                    <li key={contact.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/10 p-2 rounded-full"><User className="h-5 w-5 text-primary"/></div>
                                            <div>
                                                <p className="font-semibold">{contact.name}</p>
                                                <p className="text-sm text-muted-foreground">{contact.phone}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteContact(contact.id)}>
                                            <Trash2 className="h-5 w-5 text-destructive" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-center py-6">Aún no has añadido ningún contacto de emergencia.</p>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

export default EmergencyContacts;
