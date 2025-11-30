import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import webrtcService from '../services/webrtcService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Phone, PhoneOff, Loader2, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

const CallInterface = ({ callId, targetUser, isInitiator, onEnd, user }) => {
    const [callStatus, setCallStatus] = useState('connecting'); // connecting | ringing | connected | ended
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        let interval;
        if (callStatus === 'connected') {
            interval = setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [callStatus]);

    useEffect(() => {
        // Escuchar cambios en el estado de la llamada
        const unsubscribe = onSnapshot(doc(db, 'calls', callId), (snapshot) => {
            const data = snapshot.data();
            if (data) {
                setCallStatus(data.status);
                if (data.status === 'ended') {
                    handleEndCall();
                }
            } else {
                setCallStatus('ended');
            }
        });

        return () => unsubscribe();
    }, [callId]);

    const handleEndCall = async () => {
        await webrtcService.endCall(callId);
        toast.success('Llamada finalizada');
        onEnd?.();
    };

    const toggleMute = () => {
        if (webrtcService.localStream) {
            const audioTrack = webrtcService.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-8 max-w-md w-full mx-4">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                        <Phone className="h-12 w-12 text-primary" />
                    </div>

                    <div className="text-center">
                        <h3 className="text-2xl font-semibold">{targetUser?.displayName || 'Usuario'}</h3>
                        <p className="text-lg text-muted-foreground mt-2">
                            {callStatus === 'connecting' && 'Conectando...'}
                            {callStatus === 'ringing' && (isInitiator ? 'Llamando...' : 'Llamada entrante')}
                            {callStatus === 'connected' && formatDuration(duration)}
                            {callStatus === 'ended' && 'Llamada finalizada'}
                        </p>
                    </div>

                    {callStatus === 'connecting' && (
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    )}

                    <audio id="remoteAudio" autoPlay />

                    <div className="flex gap-4 mt-4">
                        {callStatus === 'connected' && (
                            <Button
                                onClick={toggleMute}
                                variant="outline"
                                size="lg"
                                className="rounded-full w-16 h-16"
                            >
                                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                            </Button>
                        )}

                        <Button
                            onClick={handleEndCall}
                            variant="destructive"
                            size="lg"
                            className="rounded-full w-16 h-16"
                        >
                            <PhoneOff className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default CallInterface;
