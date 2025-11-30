import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Busca o crea un chat entre dos usuarios y devuelve su ID.
 * @param {string} currentUserId - ID del usuario actual.
 * @param {string} otherUserId - ID del otro usuario.
 * @returns {string} El ID del chat.
 */
export const getOrCreateChat = async (currentUserId, otherUserId) => {
    if (!currentUserId || !otherUserId) throw new Error("Se requieren los IDs de ambos usuarios.");

    const participants = [currentUserId, otherUserId].sort();
    const chatId = participants.join('_');

    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);

    if (chatSnap.exists()) {
        return chatId;
    }

    const user1Doc = await getDoc(doc(db, 'users', currentUserId));
    const user2Doc = await getDoc(doc(db, 'users', otherUserId));

    if (!user1Doc.exists() || !user2Doc.exists()) {
        throw new Error("No se pudo encontrar el perfil de uno de los usuarios.");
    }

    // --- ¡CORRECCIÓN CRÍTICA! ---
    // Se añaden fallbacks para evitar errores si los datos del perfil no existen.
    const user1Data = user1Doc.data();
    const user2Data = user2Doc.data();

    const user1Details = { 
        uid: user1Doc.id, 
        displayName: user1Data.name || 'Usuario', 
        photoURL: user1Data.photoURL || null 
    };
    const user2Details = { 
        uid: user2Doc.id, 
        displayName: user2Data.name || 'Usuario', 
        photoURL: user2Data.photoURL || null 
    };

    await setDoc(chatRef, {
        participants,
        participantDetails: [user1Details, user2Details],
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        lastMessagePreview: 'Inicia la conversación...',
        unreadCount: { [currentUserId]: 0, [otherUserId]: 0 },
    });

    return chatId;
};
