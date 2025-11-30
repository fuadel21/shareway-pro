import { useState, useEffect } from 'react';

export const useGeolocation = (watch = false) => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocalización no soportada');
            setLoading(false);
            return;
        }

        const handleSuccess = (position) => {
            setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            });
            setLoading(false);
        };

        const handleError = (err) => {
            setError(err.message);
            setLoading(false);
        };

        if (watch) {
            const watchId = navigator.geolocation.watchPosition(
                handleSuccess,
                handleError,
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        } else {
            navigator.geolocation.getCurrentPosition(handleSuccess, handleError);
        }
    }, [watch]);

    return { location, error, loading };
};
