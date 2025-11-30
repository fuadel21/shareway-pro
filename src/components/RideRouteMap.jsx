import React, { useState, useEffect, memo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getRoute } from '../services/routingService';
import { AlertCircle } from 'lucide-react';

// Fix for default Leaflet icons in React - using CDN URLs instead of imports
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to fit map bounds
const MapBounds = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length === 2) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

const RideRouteMap = memo(({ origin, destination, driverLocation, status, waypoints = [] }) => {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!origin || !destination) return;

      try {
        // Convert {lat, lng} objects to route service format
        const routeData = await getRoute(origin, destination);

        if (routeData) {
          setRouteCoordinates(routeData.coordinates);
          setMapBounds(routeData.bounds);
        }
      } catch (err) {
        console.error("Error fetching route:", err);
        setError("No se pudo cargar la ruta");
        // Fallback bounds
        setMapBounds([
          [Math.min(origin.lat, destination.lat), Math.min(origin.lng, destination.lng)],
          [Math.max(origin.lat, destination.lat), Math.max(origin.lng, destination.lng)]
        ]);
      }
    };

    fetchRoute();
  }, [origin, destination]);

  // Driver icon
  const driverIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097136.png', // Simple car icon
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
    return <div className="h-full w-full bg-gray-100 flex items-center justify-center">Esperando ubicación...</div>;
  }

  const center = [origin.lat, origin.lng];

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            color="#0055ff"
            weight={5}
            opacity={0.7}
          />
        )}

        {/* Origin Marker */}
        <Marker position={[origin.lat, origin.lng]}>
          <Popup>Origen</Popup>
        </Marker>

        {/* Destination Marker */}
        <Marker position={[destination.lat, destination.lng]}>
          <Popup>Destino</Popup>
        </Marker>

        {/* Waypoints */}
        {waypoints.map((wp, idx) => (
          <Marker key={idx} position={[wp.lat, wp.lng]}>
            <Popup>Parada {idx + 1}</Popup>
          </Marker>
        ))}

        {/* Driver Location */}
        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
            <Popup>Conductor</Popup>
          </Marker>
        )}

        {/* Fit Bounds */}
        {mapBounds && <MapBounds bounds={mapBounds} />}
      </MapContainer>

      {error && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded shadow text-red-500 text-sm flex items-center gap-2 z-[1000]">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
});

export default RideRouteMap;
