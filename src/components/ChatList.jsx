import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.jsx';
import { Loader2, MessageSquare } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import SubPageHeader from './SubPageHeader';

const getInitials = (name) => {
    if (typeof name !== 'string' || !name.trim()) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase();
};

const formatTimeAgo = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return '';
    const seconds = Math.floor((new Date() - timestamp.toDate()) / 1000);
    let interval = seconds / 31536000; if (interval > 1) return Math.floor(interval) + "a";
    interval = seconds / 2592000; if (interval > 1) return Math.floor(interval) + "m";
    interval = seconds / 86400; if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600; if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60; if (interval > 1) return Math.floor(interval) + "min";
    return "ahora";
};

function ChatList({ onUnreadChange }) {
    const navigate = useNavigate();
    const { profile: currentUser } = useOutletContext();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.uid) {
            setLoading(false);
            if (onUnreadChange) onUnreadChange(0);
            return;
        }

        const chatsQuery = query(
            collection(db, 'chats'), 
            where('participants', 'array-contains', currentUser.uid), 
            orderBy('lastActivity', 'desc')
        );

        const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
            try {
                const chatsData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const otherUserId = data.participants?.find(id => id !== currentUser.uid);

                    let otherUserName = 'Usuario Desconocido';
                    let otherUserPhoto = '';

                    if (otherUserId && Array.isArray(data.participantDetails)) {
                        const detail = data.participantDetails.find(p => p.uid === otherUserId);
                        if(detail) {
                            otherUserName = detail.displayName || 'Usuario Desconocido';
                            otherUserPhoto = detail.photoURL || '';
                        }
                    }
                    
                    const unreadCount = data.unreadCount?.[currentUser.uid] || 0;
                    const lastMessagePreview = data.lastMessagePreview || 'Toca para ver la conversación';

                    return { 
                        id: doc.id, 
                        otherUserName,
                        otherUserPhoto,
                        unreadCount,
                        lastMessagePreview,
                        lastActivity: data.lastActivity,
                    };
                });
                
                setChats(chatsData);

                if (onUnreadChange) {
                    const totalUnreadMessages = chatsData.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
                    onUnreadChange(totalUnreadMessages);
                }
            } catch (error) {
                console.error("Error al procesar la lista de chats:", error);
                setChats([]);
                // --- INICIO DE LA CORRECCIÓN ---
                toast.error("Error Crítico: Falla al procesar datos del ChatList", { description: error.message });
                // --- FIN DE LA CORRECCIÓN ---
            } finally {
                setLoading(false);
            }
        }, (error) => {
            console.error("Error en el listener de chats de Firestore:", error);
            if (error.code === 'failed-precondition') {
                 toast.error("Error de Base de Datos: Índice Faltante", { 
                    description: "Por favor, crea el índice compuesto para la colección 'chats'.",
                    duration: 10000
                });
            } else {
                // --- INICIO DE LA CORRECCIÓN ---
                 toast.error("Error de Base de Datos: Falla en la consulta de ChatList", { description: `Código: ${error.code}` });
                // --- FIN DE LA CORRECCIÓN ---
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, onUnreadChange]);

    const handleChatClick = (chatId) => navigate(`/chat/${chatId}`);

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <SubPageHeader title="Mensajes" />
            <main className="container mx-auto p-4">
                {chats.length > 0 ? (
                    <div className="bg-white rounded-lg shadow"><ul className="divide-y divide-gray-200">
                        {chats.map(chat => (
                            <li key={chat.id} onClick={() => handleChatClick(chat.id)} className="p-4 flex items-center hover:bg-gray-50 cursor-pointer">
                                <Avatar className="h-12 w-12 mr-4"><AvatarImage src={chat.otherUserPhoto} /><AvatarFallback>{getInitials(chat.otherUserName)}</AvatarFallback></Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between">
                                        <h2 className={`font-semibold ${chat.unreadCount > 0 ? 'text-primary-600' : 'text-gray-800'}`}>{chat.otherUserName}</h2>
                                        <span className="text-xs text-gray-500">{formatTimeAgo(chat.lastActivity)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-sm ${chat.unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-600'} truncate`}>
                                            {chat.lastMessagePreview}
                                        </p>
                                        {chat.unreadCount > 0 && (
                                            <span className="ml-2 flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5">{chat.unreadCount}</span>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul></div>
                ) : (
                    <div className="text-center py-24 space-y-4">
                        <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="text-lg font-semibold">Sin Conversaciones</h3>
                        <p className="text-gray-500">Cuando contactes con un conductor o pasajero, tus chats aparecerán aquí.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default ChatList;
