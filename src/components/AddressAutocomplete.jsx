import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, X } from 'lucide-react';

const AddressAutocomplete = ({ value, onChange, placeholder = "Buscar dirección...", className }) => {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Update internal query when external value changes
    useEffect(() => {
        if (value && typeof value === 'string') {
            setQuery(value);
        } else if (value && value.address) {
            setQuery(value.address);
        }
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const searchAddress = async (searchQuery) => {
        if (!searchQuery || searchQuery.length < 3) return;

        setLoading(true);
        try {
            // Using Nominatim OpenStreetMap API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'es', // Prefer Spanish results
                        'User-Agent': 'TaxiCompartidoApp/1.0' // Required by Nominatim usage policy
                    }
                }
            );
            const data = await response.json();
            setResults(data);
            setIsOpen(true);
        } catch (error) {
            console.error("Error searching address:", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query && query !== value?.address && query !== value) {
                searchAddress(query);
            }
        }, 1000); // 1 second debounce to be nice to Nominatim API

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (item) => {
        const formattedAddress = item.display_name;
        setQuery(formattedAddress);
        setIsOpen(false);

        // Return object compatible with what the app expects
        // Google Maps usually returns { address, coordinates: { lat, lng } }
        onChange({
            address: formattedAddress,
            coordinates: {
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon)
            },
            raw: item
        });
    };

    const handleClear = () => {
        setQuery('');
        setResults([]);
        onChange(null);
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                        // Reset parent state when user types to force selection
                        if (onChange) onChange(null);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && results.length > 0) {
                            e.preventDefault();
                            handleSelect(results[0]);
                        }
                    }}
                    placeholder={placeholder}
                    className="pl-9 pr-9"
                />
                {query && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                        onClick={handleClear}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {
                isOpen && (results.length > 0 || loading) && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {loading && (
                            <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Buscando...
                            </div>
                        )}
                        {!loading && results.map((item) => (
                            <button
                                key={item.place_id}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 focus:bg-slate-100 focus:outline-none border-b last:border-0"
                                onClick={() => handleSelect(item)}
                            >
                                <p className="font-medium truncate">{item.name || item.address?.road || item.display_name.split(',')[0]}</p>
                                <p className="text-xs text-muted-foreground truncate">{item.display_name}</p>
                            </button>
                        ))}
                    </div>
                )
            }
        </div >
    );
};

export default AddressAutocomplete;
