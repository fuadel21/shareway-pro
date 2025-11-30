import { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import SubPageHeader from './SubPageHeader';
import { Loader2, Send } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';

const getInitials = (name) => {
    if (typeof name !== 'string' || !name.trim()) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase();
};

function RideChat() {
    const { rideId } = useParams(); // <--- CAMBIO: Usar rideId
    const { profile: currentUserProfile } = useOutletContext();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [ride, setRide] = useState(null); // <--- CAMBIO: Estado para el viaje
    const [participants, setParticipants] = useState({}); // <--- CAMBIO: Estado para los participantes
    const [loading, setLoading] = useState(true);
    const chatEndRef = useRef(null);

    useEffect(() => {
        if (!rideId || !currentUserProfile?.uid) return;

        // Cargar datos del viaje y participantes
        const rideDocRef = doc(db, 'rides', rideId);
        const unsubscribeRide = onSnapshot(rideDocRef, async (rideDoc) => {
            if (rideDoc.exists()) {
                const rideData = rideDoc.data();
                setRide(rideData);
                // Aquí cargaremos los perfiles de los participantes
            } else {
                toast.error("Chat de viaje no encontrado.");
            }
            setLoading(false);
        });

        // Cargar mensajes del chat del viaje
        const messagesRef = collection(db, 'rides', rideId, 'messages');
        const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
        const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => { unsubscribeRide(); unsubscribeMessages(); };
    }, [rideId, currentUserProfile]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUserProfile) return;

        const textToSend = newMessage.trim();
        setNewMessage('');

        const messagesRef = collection(db, 'rides', rideId, 'messages');
        
        try {
            await addDoc(messagesRef, {
                senderId: currentUserProfile.uid,
                senderName: currentUserProfile.displayName,
                senderPhotoURL: currentUserProfile.photoURL || null,
                text: textToSend,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error al enviar el mensaje:", error);
            toast.error("No se pudo enviar el mensaje.");
            setNewMessage(textToSend); 
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>;

    return (
        <div className="h-screen flex flex-col bg-gray-100 relative">
            <SubPageHeader title={ride?.destination || 'Chat del Viaje'} />
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.senderId === currentUserProfile.uid ? 'justify-end' : ''}`}>
                        {msg.senderId !== currentUserProfile.uid && (
                            <Avatar className="w-10 h-10">
                                <AvatarImage src={msg.senderPhotoURL} />
                                <AvatarFallback>{getInitials(msg.senderName)}</AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`flex flex-col ${msg.senderId === currentUserProfile.uid ? 'items-end' : 'items-start'}`}>
                             {msg.senderId !== currentUserProfile.uid && <p className="text-xs text-gray-500 mb-1 ml-2">{msg.senderName}</p>}
                            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.senderId === currentUserProfile.uid ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-white rounded-bl-none'}`}>
                                <p className="text-sm">{msg.text}</p>
                            </div>
                        </div>
                         {msg.senderId === currentUserProfile.uid && (
                            <Avatar className="w-10 h-10">
                                <AvatarImage src={currentUserProfile.photoURL} />
                                <AvatarFallback>{getInitials(currentUserProfile.displayName)}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                 <div ref={chatEndRef} />
            </main>
            <footer className="bg-white p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Escribe un mensaje..." className="flex-1 h-12"/>
                    <Button type="submit" size="icon" className="h-12 w-12" disabled={!newMessage.trim()}><Send className="h-6 w-6" /></Button>
                </form>
            </footer>
        </div>
    );
}

export default RideChat;
