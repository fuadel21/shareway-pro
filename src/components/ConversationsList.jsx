import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const getInitials = (name) => {
    if (typeof name !== 'string' || !name.trim()) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase();
};

function ConversationsList() {
    const { profile: currentUserProfile } = useOutletContext();
    const { chatId: activeChatId } = useParams();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUserProfile?.uid) return;

        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUserProfile.uid),
            orderBy('lastUpdate', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const convos = snapshot.docs.map(doc => {
                const data = doc.data();
                const otherUserId = doc.id.split('_').find(id => id !== currentUserProfile.uid);
                const otherUserInfo = data.participantInfo?.[otherUserId] || {};
                const unreadCount = data.unreadCount?.[currentUserProfile.uid] || 0;

                return {
                    id: doc.id,
                    ...data,
                    otherUser: otherUserInfo,
                    unread: unreadCount > 0
                };
            });
            setConversations(convos);
            setLoading(false);
        }, (error) => {
            // NOTA: Si este error aparece en la consola, es muy probable que falte un índice en Firestore.
            console.error("Error fetching conversations: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUserProfile]);

    if (loading) {
        return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    if (conversations.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <h3 className="font-semibold text-lg">Bandeja de Entrada Vacía</h3>
                <p className="text-sm text-gray-500 mt-1">Cuando contactes con un conductor o pasajero, tu conversación aparecerá aquí.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
             <header className="p-4 border-b">
                <h2 className="text-xl font-bold">Mensajes</h2>
            </header>
            <div className="flex-1 overflow-y-auto">
                {conversations.map(convo => (
                    // ¡CORREGIDO! La ruta ahora es /chat/ en lugar de /messages/
                    <Link to={`/chat/${convo.id}`} key={convo.id} className={cn(
                        "block p-4 border-b hover:bg-gray-50",
                        activeChatId === convo.id && 'bg-primary/10'
                    )}>
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={convo.otherUser.photoURL} />
                                <AvatarFallback>{getInitials(convo.otherUser.displayName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold truncate">{convo.otherUser.displayName}</p>
                                    {convo.lastUpdate && (
                                        <p className="text-xs text-gray-500 whitespace-nowrap">{formatDistanceToNow(convo.lastUpdate.toDate(), { addSuffix: true, locale: es })}</p>
                                    )}
                                </div>
                                <div className="flex justify-between items-start">
                                    <p className="text-sm text-gray-600 truncate pr-4">{convo.lastMessage}</p>
                                    {convo.unread && <span className="w-3 h-3 bg-primary rounded-full flex-shrink-0"></span>}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default ConversationsList;
