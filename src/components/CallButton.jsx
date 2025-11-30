import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import webrtcService from '../services/webrtcService';
import CallInterface from './CallInterface';
import { toast } from 'sonner';

const CallButton = ({ targetUserId, disabled, user, profile }) => {
    const [calling, setCalling] = useState(false);
    const [callId, setCallId] = useState(null);
    const [targetUser, setTargetUser] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [isInitiator, setIsInitiator] = useState(false);

    // Escuchar llamadas entrantes
    useEffect(() => {
        if (!user) return;

        const callsRef = collection(db, 'calls');
        const q = query(
            callsRef,
            where('calleeId', '==', user.uid),
            where('status', '==', 'ringing')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const callData = change.doc.data();
                    const callerDoc = await getDoc(doc(db, 'users', callData.callerId));

                    setIncomingCall({
                        id: change.doc.id,
                        data: callData,
                        caller: callerDoc.data()
                    });

                    // Auto-responder después de 2 segundos
                    setTimeout(() => {
                        handleAnswerCall(change.doc.id, callData, callerDoc.data());
                    }, 2000);
                }
            });
        });

        return () => unsubscribe();
    }, [user]);

    const handleCall = async () => {
        try {
            // Verificar que el usuario actual tenga teléfono verificado
            if (!profile?.phoneVerified) {
                toast.error('Debes verificar tu teléfono primero');
                return;
            }

            // Verificar que el usuario objetivo tenga teléfono verificado
            const targetDoc = await getDoc(doc(db, 'users', targetUserId));
            const targetData = targetDoc.data();

            if (!targetData?.phoneVerified) {
                toast.error('El usuario debe tener su teléfono verificado');
                return;
            }

            setTargetUser(targetData);
            const newCallId = `${user.uid}_${targetUserId}_${Date.now()}`;
            setCallId(newCallId);
            setIsInitiator(true);
            setCalling(true);

            await webrtcService.createOffer(newCallId, user.uid, targetUserId);
            toast.success('Llamada iniciada');
        } catch (error) {
            console.error('Error iniciando llamada:', error);
            toast.error('Error al iniciar llamada: ' + error.message);
            setCalling(false);
        }
    };

    const handleAnswerCall = async (callId, callData, caller) => {
        try {
            setCallId(callId);
            setTargetUser(caller);
            setIsInitiator(false);
            setCalling(true);
            setIncomingCall(null);

            await webrtcService.answerCall(callId, callData);
            toast.success('Llamada conectada');
        } catch (error) {
            console.error('Error respondiendo llamada:', error);
            toast.error('Error al responder llamada');
            setCalling(false);
        }
    };

    if (calling && callId) {
        return (
            <CallInterface
                callId={callId}
                targetUser={targetUser}
                isInitiator={isInitiator}
                user={user}
                onEnd={() => {
                    setCalling(false);
                    setCallId(null);
                    setTargetUser(null);
                }}
            />
        );
    }

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={handleCall}
            disabled={disabled || calling}
            title="Llamar (anónimo)"
        >
            {calling ? <Loader2 className="h-5 w-5 animate-spin" /> : <Phone className="h-5 w-5" />}
        </Button>
    );
};

export default CallButton;
