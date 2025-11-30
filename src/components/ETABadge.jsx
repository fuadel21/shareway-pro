import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2 } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export function ETABadge({ origin, destination, rideId }) {
    const [eta, setEta] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if ((!origin || !destination) && !rideId) return;

        const fetchETA = async () => {
            try {
                const functions = getFunctions();
                const calculateETA = httpsCallable(functions, 'calculateETA');

                const result = await calculateETA({
                    origin: origin?.location,
                    destination: destination?.location,
                    rideId
                });

                setEta(result.data);
            } catch (error) {
                console.error("Failed to fetch ETA:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchETA();

        // Refresh every 5 minutes
        const interval = setInterval(fetchETA, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [origin, destination, rideId]);

    if (loading) {
        return <Badge variant="outline" className="animate-pulse"><Clock className="w-3 h-3 mr-1" /> ...</Badge>;
    }

    if (!eta) return null;

    return (
        <Badge variant="secondary" className="flex items-center gap-1" title={`Distancia: ${eta.distance}`}>
            <Clock className="w-3 h-3" />
            <span>{eta.duration}</span>
            {eta.isEstimate && <span className="text-[10px] opacity-70 ml-1">(est.)</span>}
        </Badge>
    );
}
