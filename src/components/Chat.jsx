import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

// --- Componentes UI ---
import SubPageHeader from './SubPageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const getInitials = (name) => name?.charAt(0).toUpperCase() || '';

// --- Componente de Mensaje Individual ---
const Message = ({ message, isSender }) => (
    <div className={cn("flex items-end gap-2 max-w-[80%]", isSender ? "self-end" : "self-start")}>
        <div className={cn(
            "p-3 rounded-2xl",
            isSender ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
        )}>
            <p className="text-sm">{message.text}</p>
            <p className="text-xs text-right mt-1 opacity-70">{message.createdAt ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
        </div>
    </div>
);

// --- Componente Principal del Chat ---
const Chat = () => {
    const { chatId } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useOutletContext();
    
    const [chatInfo, setChatInfo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!user || !chatId) return;

        const chatRef = doc(db, 'chats', chatId);

        const unsubscribeChatInfo = onSnapshot(chatRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().participants.includes(user.uid)) {
                setChatInfo({ id: docSnap.id, ...docSnap.data() });
                setIsLoading(false);
            } else {
                // No hacer nada aquí, puede que el documento se esté creando
            }
        }, (error) => {
            console.error("Error al obtener la información del chat:", error);
            toast.error("No se pudo cargar el chat.");
            navigate('/chats', { replace: true });
        });

        const messagesQuery = query(collection(chatRef, 'messages'), orderBy('createdAt', 'asc'));
        const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
        }, (error) => {
            console.error("Error en el listener de mensajes:", error);
            toast.error("Error al cargar los mensajes.");
        });

        return () => {
            unsubscribeChatInfo();
            unsubscribeMessages();
        };

    }, [chatId, user, navigate]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !chatId || !user) return;

        setIsSending(true);
        try {
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            await addDoc(messagesRef, {
                text: newMessage,
                senderId: user.uid,
                createdAt: serverTimestamp(),
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error al enviar mensaje:", error);
            toast.error("No se pudo enviar el mensaje.");
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading || !chatInfo || !profile) {
        return (
            <div className="h-screen flex flex-col">
                <SubPageHeader title="Cargando Chat..." />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        );
    }

    const otherParticipantId = chatInfo.participants.find(p => p !== user.uid);
    const otherParticipant = chatInfo.participantDetails?.[otherParticipantId] || {};

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <SubPageHeader title={otherParticipant.displayName || 'Chat'}>
                <Avatar className="ml-2">
                    <AvatarImage src={otherParticipant.photoURL} />
                    <AvatarFallback>{getInitials(otherParticipant.displayName)}</AvatarFallback>
                </Avatar>
            </SubPageHeader>

            {/* --- INICIO DE LA CORRECCIÓN DEFINITIVA -- */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
                {messages.map(msg => (
                    <Message key={msg.id} message={msg} isSender={msg.senderId === user.uid} />
                ))}
                <div ref={messagesEndRef} />
            </div>
            {/* --- FIN DE LA CORRECCIÓN DEFINITIVA -- */}

            <div className="p-4 bg-white border-t">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        autoComplete="off"
                        disabled={isSending}
                    />
                    <Button type="submit" size="icon" disabled={isSending || newMessage.trim() === ''}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default Chat;
