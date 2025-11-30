
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, HeartHandshake, Share2, Mic, ShieldQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOutletContext } from 'react-router-dom';
import { doc, updateDoc, collection, addDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

// --- Sub-componente para Contactos de Emergencia ---
const EmergencyContactsManager = () => {
    const { profile } = useOutletContext();
    const [contacts, setContacts] = useState([]);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');

    // Obtener contactos
    useState(() => {
        if (!profile?.uid) return;
        const contactsCol = collection(db, `users/${profile.uid}/emergencyContacts`);
        const unsubscribe = onSnapshot(contactsCol, (snapshot) => {
            setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [profile?.uid]);

    // Añadir contacto
    const handleAddContact = async () => {
        if (!newName.trim() || !newPhone.trim()) {
            toast.error('El nombre y el teléfono no pueden estar vacíos.');
            return;
        }
        try {
            const contactsCol = collection(db, `users/${profile.uid}/emergencyContacts`);
            await addDoc(contactsCol, { name: newName, phone: newPhone });
            setNewName('');
            setNewPhone('');
            toast.success('Contacto añadido correctamente.');
        } catch (error) {
            toast.error('Error al añadir el contacto.');
            console.error(error);
        }
    };

    // Eliminar contacto
    const handleDeleteContact = async (contactId) => {
        try {
            const contactRef = doc(db, `users/${profile.uid}/emergencyContacts`, contactId);
            await deleteDoc(contactRef);
            toast.success('Contacto eliminado.');
        } catch (error) {
            toast.error('Error al eliminar el contacto.');
        }
    };

    return (
        <div className="p-4 bg-gray-50 rounded-b-lg">
            <div className="space-y-4">
                {contacts.map(contact => (
                    <div key={contact.id} className="flex items-center justify-between p-2 bg-white rounded-md border">
                        <div>
                            <p className="font-semibold">{contact.name}</p>
                            <p className="text-sm text-muted-foreground">{contact.phone}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteContact(contact.id)}>Eliminar</Button>
                    </div>
                ))}
                 {contacts.length === 0 && <p className='text-center text-sm text-gray-500 py-4'>No has añadido ningún contacto.</p>}
            </div>
            <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold mb-2">Añadir nuevo contacto</h4>
                <div className="flex gap-2 mb-2">
                    <Input placeholder="Nombre" value={newName} onChange={(e) => setNewName(e.target.value)} />
                    <Input placeholder="Teléfono" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                </div>
                <Button onClick={handleAddContact} className="w-full">Añadir Contacto</Button>
            </div>
        </div>
    );
};

// --- Sub-componente para las opciones con interruptor ---
const SecurityToggleItem = ({ settingKey, title }) => {
    const { profile } = useOutletContext();
    const isEnabled = profile?.securitySettings?.[settingKey] || false;

    const handleToggle = async (value) => {
        try {
            const userRef = doc(db, 'users', profile.uid);
            await updateDoc(userRef, {
                [`securitySettings.${settingKey}`]: value
            });
            toast.success(`${title}: ${value ? 'Activado' : 'Desactivado'}`)
        } catch {
            toast.error('No se pudo guardar el cambio.');
        }
    }

    return (
        <div className="p-4 bg-gray-50 rounded-b-lg flex items-center justify-between">
            <p className="font-medium">Activar {title}</p>
            <Switch checked={isEnabled} onCheckedChange={handleToggle} />
        </div>
    )
}


const AccordionItem = ({ icon: Icon, title, description, children, isOpen, onClick }) => (
    <div className="border-b">
        <button onClick={onClick} className="w-full text-left p-4 hover:bg-accent transition-colors flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Icon className="h-6 w-6 text-muted-foreground" />
                <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && <div>{children}</div>}
    </div>
);


function SecuritySettings() {
    const navigate = useNavigate();
    const [openItem, setOpenItem] = useState(null);

    const handleItemClick = (index) => {
        setOpenItem(openItem === index ? null : index);
    };

    const securityItems = [
        { 
            id: 'emergencyContacts',
            icon: HeartHandshake, 
            title: 'Contactos de Emergencia', 
            description: 'Añade personas de confianza para notificar en caso de emergencia.', 
            content: <EmergencyContactsManager />
        },
        { 
            id: 'shareTrip',
            icon: Share2, 
            title: 'Compartir Mi Viaje', 
            description: 'Permite que tus contactos sigan tu viaje en tiempo real.', 
            content: <SecurityToggleItem settingKey="shareTripEnabled" title="Compartir Mi Viaje" />
        },
        { 
            id: 'audioRecording',
            icon: Mic, 
            title: 'Grabación de Audio', 
            description: 'Inicia una grabación de audio si te sientes inseguro.', 
            content: <SecurityToggleItem settingKey="audioRecordingEnabled" title="Grabación de Audio" />
        },
        { 
            id: 'pinVerification',
            icon: ShieldQuestion, 
            title: 'Verificación por PIN', 
            description: 'Asegúrate de que estás con el conductor correcto.', 
            content: <SecurityToggleItem settingKey="pinVerificationEnabled" title="Verificación por PIN" />
        }
    ];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="container mx-auto p-4 max-w-2xl">
                <div className="flex items-center gap-4 my-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                       {/* <ArrowLeft /> */}
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-800">Centro de Seguridad</h1>
                </div>
                <p className="text-muted-foreground mb-8">Tu seguridad es nuestra prioridad. Aquí puedes configurar herramientas adicionales para viajar con más tranquilidad.</p>
                <div className="bg-card rounded-lg border">
                    {securityItems.map((item, index) => (
                        <AccordionItem 
                            key={index}
                            icon={item.icon}
                            title={item.title}
                            description={item.description}
                            isOpen={openItem === index}
                            onClick={() => handleItemClick(index)}
                        >
                            {item.content}
                        </AccordionItem>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default SecuritySettings;
