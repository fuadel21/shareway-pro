import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, collection, onSnapshot, addDoc, setDoc, deleteDoc, getDocs, writeBatch, getDoc } from 'firebase/firestore';

const servers = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};

export const useWebRTC = (chatId, currentUserId, setCallSession) => {
    const pc = useRef(new RTCPeerConnection(servers));
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(new MediaStream());

    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);

    // Listener para la sesión de llamada
    useEffect(() => {
        if (!chatId) return;

        const callDocRef = doc(db, 'chats', chatId, 'call', 'session');
        const unsubscribe = onSnapshot(callDocRef, (snapshot) => {
            const data = snapshot.data();
            setCallSession(snapshot.exists() ? { id: snapshot.id, ...data } : null);

            // Si el otro par responde, establece la descripción remota
            if (data?.answer && pc.current.signalingState !== 'stable') {
                pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        });

        return unsubscribe;
    }, [chatId, setCallSession]);

    // Listener para los candidatos ICE
    useEffect(() => {
        if (!chatId) return;

        const callerCandidatesCollection = collection(db, 'chats', chatId, 'callerCandidates');
        const calleeCandidatesCollection = collection(db, 'chats', chatId, 'calleeCandidates');

        const unsubCaller = onSnapshot(callerCandidatesCollection, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    pc.current.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                }
            });
        });

        const unsubCallee = onSnapshot(calleeCandidatesCollection, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    pc.current.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                }
            });
        });

        return () => {
            unsubCaller();
            unsubCallee();
        };
    }, [chatId]);

    const setupStreams = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        stream.getTracks().forEach((track) => {
            pc.current.addTrack(track, stream);
        });
        setLocalStream(stream);

        pc.current.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remoteStreamRef.current.addTrack(track);
            });
            setRemoteStream(remoteStreamRef.current);
        };
    };

    const startCall = async (otherUserId) => {
        await setupStreams();
        const callDocRef = doc(db, 'chats', chatId, 'call', 'session');
        const callerCandidatesCollection = collection(db, 'chats', chatId, 'callerCandidates');

        pc.current.onicecandidate = (event) => {
            event.candidate && addDoc(callerCandidatesCollection, event.candidate.toJSON());
        };

        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);

        // CORREGIDO: Usamos setDoc con merge para crear o actualizar el documento de forma segura
        await setDoc(callDocRef, { offer, callerId: currentUserId, calleeId: otherUserId, status: 'dialing' }, { merge: true });
    };

    const answerCall = async () => {
        await setupStreams();
        const callDocRef = doc(db, 'chats', chatId, 'call', 'session');
        const callDocSnapshot = await getDoc(callDocRef);
        const calleeCandidatesCollection = collection(db, 'chats', chatId, 'calleeCandidates');

        pc.current.onicecandidate = (event) => {
            event.candidate && addDoc(calleeCandidatesCollection, event.candidate.toJSON());
        };

        if (callDocSnapshot.exists()) {
            await pc.current.setRemoteDescription(new RTCSessionDescription(callDocSnapshot.data().offer));
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);
            // Aquí `updateDoc` está bien porque sabemos que el documento ya existe.
            await updateDoc(callDocRef, { answer, status: 'active' });
        }
    };

    const endCall = useCallback(async () => {
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        pc.current.close();
        
        // Reiniciar el RTCPeerConnection para futuras llamadas
        pc.current = new RTCPeerConnection(servers);

        setLocalStream(null);
        setRemoteStream(null);
        setCallSession(null);

        // Limpiar documentos de la llamada en Firestore
        const callDocRef = doc(db, 'chats', chatId, 'call', 'session');
        const callerCandidates = await getDocs(collection(db, 'chats', chatId, 'callerCandidates'));
        const calleeCandidates = await getDocs(collection(db, 'chats', chatId, 'calleeCandidates'));
        
        const batch = writeBatch(db);
        callerCandidates.forEach(doc => batch.delete(doc.ref));
        calleeCandidates.forEach(doc => batch.delete(doc.ref));
        batch.delete(callDocRef);
        await batch.commit();

    }, [chatId, setCallSession]);

    return { startCall, endCall, answerCall, localStream, remoteStream };
};
