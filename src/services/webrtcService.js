import { db } from '../lib/firebase';
import { collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

class WebRTCService {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }, // STUN server gratuito de Google
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
        this.candidatesUnsubscribe = null;
        this.callUnsubscribe = null;
    }

    async initializeCall(callId, isInitiator) {
        try {
            // Crear conexión peer
            this.peerConnection = new RTCPeerConnection(this.configuration);

            // Obtener audio local
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });

            // Añadir tracks locales
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Manejar ICE candidates
            this.peerConnection.onicecandidate = async (event) => {
                if (event.candidate) {
                    await addDoc(collection(db, `calls/${callId}/candidates`), {
                        candidate: event.candidate.toJSON(),
                        from: isInitiator ? 'caller' : 'callee',
                        timestamp: new Date().toISOString()
                    });
                }
            };

            // Manejar stream remoto
            this.peerConnection.ontrack = (event) => {
                const remoteAudio = document.getElementById('remoteAudio');
                if (remoteAudio) {
                    remoteAudio.srcObject = event.streams[0];
                }
            };

            // Manejar estado de conexión
            this.peerConnection.onconnectionstatechange = () => {
                console.log('Connection state:', this.peerConnection.connectionState);
                if (this.peerConnection.connectionState === 'disconnected' ||
                    this.peerConnection.connectionState === 'failed') {
                    this.endCall(callId);
                }
            };

            return this.peerConnection;
        } catch (error) {
            console.error('Error inicializando llamada:', error);
            throw error;
        }
    }

    async createOffer(callId, callerId, calleeId) {
        await this.initializeCall(callId, true);

        // Crear oferta
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        // Guardar oferta en Firestore
        await setDoc(doc(db, 'calls', callId), {
            callerId,
            calleeId,
            offer: {
                type: offer.type,
                sdp: offer.sdp
            },
            status: 'ringing',
            createdAt: new Date().toISOString()
        });

        // Escuchar respuesta
        this.listenForAnswer(callId);
        this.listenForCandidates(callId, false);
    }

    async answerCall(callId, callData) {
        await this.initializeCall(callId, false);

        // Establecer descripción remota (oferta)
        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(callData.offer)
        );

        // Crear respuesta
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        // Guardar respuesta en Firestore
        await updateDoc(doc(db, 'calls', callId), {
            answer: {
                type: answer.type,
                sdp: answer.sdp
            },
            status: 'connected'
        });

        this.listenForCandidates(callId, true);
    }

    listenForAnswer(callId) {
        this.callUnsubscribe = onSnapshot(doc(db, 'calls', callId), async (snapshot) => {
            const data = snapshot.data();
            if (data?.answer && !this.peerConnection.currentRemoteDescription) {
                await this.peerConnection.setRemoteDescription(
                    new RTCSessionDescription(data.answer)
                );
            }
        });
    }

    listenForCandidates(callId, isInitiator) {
        const candidatesRef = collection(db, `calls/${callId}/candidates`);
        this.candidatesUnsubscribe = onSnapshot(candidatesRef, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const shouldAdd = isInitiator ? data.from === 'callee' : data.from === 'caller';

                    if (shouldAdd && this.peerConnection) {
                        try {
                            await this.peerConnection.addIceCandidate(
                                new RTCIceCandidate(data.candidate)
                            );
                        } catch (error) {
                            console.error('Error adding ICE candidate:', error);
                        }
                    }
                }
            });
        });
    }

    async endCall(callId) {
        // Cerrar conexión
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Detener streams
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Cancelar listeners
        if (this.candidatesUnsubscribe) {
            this.candidatesUnsubscribe();
            this.candidatesUnsubscribe = null;
        }

        if (this.callUnsubscribe) {
            this.callUnsubscribe();
            this.callUnsubscribe = null;
        }

        // Limpiar Firestore
        if (callId) {
            try {
                await updateDoc(doc(db, 'calls', callId), {
                    status: 'ended',
                    endedAt: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error updating call status:', error);
            }
        }
    }
}

export default new WebRTCService();
