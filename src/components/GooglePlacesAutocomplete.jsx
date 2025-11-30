import React, { useEffect } from 'react';
import usePlacesAutocomplete, {
    getGeocode,
    getLatLng,
} from 'use-places-autocomplete';
import { Input } from '@/components/ui/input.jsx';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOutletContext } from 'react-router-dom';

const GooglePlacesAutocomplete = ({ onPlaceSelect, placeholder, id, initialValue = '' }) => {
    const { mapsLoaded } = useOutletContext();

    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
        init,
    } = usePlacesAutocomplete({
        initOnMount: false, 
        requestOptions: {
            componentRestrictions: { country: 'es' }, 
        },
        debounce: 300,
        defaultValue: initialValue,
    });

    useEffect(() => {
        if (mapsLoaded) {
            init();
        }
    }, [mapsLoaded, init]);

    useEffect(() => {
        if (initialValue) {
            setValue(initialValue, false);
        }
    }, [initialValue, setValue]);

    const handleSelect = async (address) => {
        setValue(address, false);
        clearSuggestions();

        try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);
            
            // --- ¡LA SOLUCIÓN FINAL Y VERDADERA! ---
            // Solo pasamos los datos limpios y necesarios al componente padre.
            onPlaceSelect({ 
                address,
                coordinates: { lat, lng },
            });
        } catch (error) {
            console.error('Error getting location:', error);
            // Opcional: notificar al usuario que hubo un error al obtener la ubicación
            onPlaceSelect(null); 
        }
    };

    return (
        <div className="relative w-full">
            <Input
                id={id}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={!ready}
                placeholder={placeholder}
                required
                className="h-11"
                autoComplete="off"
            />
            {status === 'OK' && (
                <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl">
                    <ul className="py-1">
                        {data.map(({ place_id, description, structured_formatting }) => (
                            <li 
                                key={place_id} 
                                onClick={() => handleSelect(description)}
                                className="px-4 py-3 cursor-pointer hover:bg-gray-100 flex items-center gap-4"
                            >
                                <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                <div>
                                    <span className="font-semibold text-gray-800">{structured_formatting.main_text}</span>
                                    <span className="text-sm text-gray-500 ml-2">{structured_formatting.secondary_text}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default GooglePlacesAutocomplete;
