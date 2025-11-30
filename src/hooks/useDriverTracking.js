import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

/**
 * Hook personalizado para el seguimiento de la ubicación de un conductor durante un viaje.
 * @param {string} rideId - El ID del viaje que se está siguiendo.
 */
export function useDriverTracking(rideId) {
    const [isTracking, setIsTracking] = useState(false);
    const watchIdRef = useRef(null); // Usamos una ref para almacenar el ID del watcher

    const stopTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
            setIsTracking(false);
            console.log("Seguimiento de ubicación detenido.");
        }
    }, []);

    const startTracking = useCallback(() => {
        if (!rideId) return;

        console.log("Iniciando seguimiento de ubicación...");

        const options = {
            enableHighAccuracy: true, // Máxima precisión
            timeout: 10000,           // Tiempo máximo de espera para una actualización
            maximumAge: 5000           // Usar una posición en caché si no es más antigua de 5s
        };

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                console.log(`Nueva ubicación: ${latitude}, ${longitude}`);

                try {
                    const rideRef = doc(db, 'rides', rideId);
                    // CORREGIDO: El campo se llama `currentLocation` en el resto de la app.
                    await updateDoc(rideRef, {
                        currentLocation: {
                            latitude,
                            longitude,
                            timestamp: new Date()
                        }
                    });
                } catch (error) {
                    console.error("Error al actualizar la ubicación del conductor en Firestore:", error);
                    toast.error("No se pudo actualizar tu ubicación en el mapa.");
                    // Si hay un error (ej. el documento no existe), detenemos el seguimiento
                    stopTracking();
                }
            },
            (error) => {
                console.error("Error en watchPosition:", error);
                toast.error("No se pudo obtener tu ubicación en tiempo real.", {
                    description: error.message
                });
                // Detenemos el seguimiento si el usuario revoca los permisos, por ejemplo
                stopTracking();
            },
            options
        );

        setIsTracking(true);
    }, [rideId, stopTracking]);

    // Efecto de limpieza: nos aseguramos de detener el seguimiento si el componente se desmonta
    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, [stopTracking]);

    return { isTracking, startTracking, stopTracking };
}
