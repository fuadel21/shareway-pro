export type RouteType = 'tren' | 'autobus' | 'transfer';

export type PopularRoute = {
  slug: string;
  title: string;
  origin: string;
  destination: string;
  type: RouteType;
  description: string;
  highlights: string[];
};

export const popularRoutes: PopularRoute[] = [
  {
    slug: 'barcelona-aeropuerto',
    title: 'Transfer Barcelona - Aeropuerto BCN',
    origin: 'Barcelona',
    destination: 'Aeropuerto de Barcelona',
    type: 'transfer',
    description: 'Solicita traslado privado entre Barcelona ciudad y el aeropuerto BCN para hoteles, vuelos y recogidas programadas.',
    highlights: ['Ideal para vuelos', 'Presupuesto manual', 'Recogida en hotel o terminal']
  },
  {
    slug: 'aeropuerto-barcelona-lloret-de-mar',
    title: 'Transfer Aeropuerto Barcelona - Lloret de Mar',
    origin: 'Aeropuerto de Barcelona',
    destination: 'Lloret de Mar',
    type: 'transfer',
    description: 'Solicita presupuesto para traslado privado desde el aeropuerto de Barcelona hasta Lloret de Mar y hoteles de la Costa Brava.',
    highlights: ['Costa Brava', 'Hotel o apartamento', 'Solicitud rapida']
  },
  {
    slug: 'aeropuerto-barcelona-blanes',
    title: 'Transfer Aeropuerto Barcelona - Blanes',
    origin: 'Aeropuerto de Barcelona',
    destination: 'Blanes',
    type: 'transfer',
    description: 'Ruta para traslados privados desde Barcelona aeropuerto hacia Blanes, hoteles, apartamentos y alojamientos turisticos.',
    highlights: ['Blanes', 'Recogida en terminal', 'Presupuesto manual']
  },
  {
    slug: 'aeropuerto-girona-lloret-de-mar',
    title: 'Transfer Aeropuerto Girona - Lloret de Mar',
    origin: 'Aeropuerto de Girona',
    destination: 'Lloret de Mar',
    type: 'transfer',
    description: 'Pide traslado desde el aeropuerto de Girona hasta Lloret de Mar para llegadas, salidas y grupos pequenos.',
    highlights: ['Aeropuerto Girona', 'Lloret de Mar', 'Traslado privado']
  },
  {
    slug: 'barcelona-sants-aeropuerto',
    title: 'Transfer Barcelona Sants - Aeropuerto BCN',
    origin: 'Barcelona Sants',
    destination: 'Aeropuerto de Barcelona',
    type: 'transfer',
    description: 'Traslado privado entre la estacion de Barcelona Sants y el aeropuerto BCN para conexiones de tren y vuelo.',
    highlights: ['Estacion Sants', 'Conexion vuelo', 'Servicio programado']
  },
  {
    slug: 'girona-costa-brava',
    title: 'Transfer Girona - Costa Brava',
    origin: 'Girona',
    destination: 'Costa Brava',
    type: 'transfer',
    description: 'Solicita presupuesto para traslados desde Girona hacia hoteles y destinos de la Costa Brava.',
    highlights: ['Aeropuerto Girona', 'Hoteles Costa Brava', 'Solicitud por WhatsApp']
  },
  {
    slug: 'barcelona-madrid',
    title: 'Barcelona - Madrid en tren o autobus',
    origin: 'Barcelona',
    destination: 'Madrid',
    type: 'tren',
    description: 'Compara opciones para viajar entre Barcelona y Madrid usando el buscador de ShareWay Pro y proveedores asociados.',
    highlights: ['Ruta de alta demanda', 'Tren y autobus', 'Salida a proveedor asociado']
  },
  {
    slug: 'madrid-valencia',
    title: 'Madrid - Valencia en tren',
    origin: 'Madrid',
    destination: 'Valencia',
    type: 'tren',
    description: 'Busca viaje entre Madrid y Valencia y continua al proveedor asociado para consultar horarios y precios reales.',
    highlights: ['Tren rapido', 'Consulta externa', 'Resumen previo en ShareWay Pro']
  },
  {
    slug: 'barcelona-girona',
    title: 'Barcelona - Girona',
    origin: 'Barcelona',
    destination: 'Girona',
    type: 'autobus',
    description: 'Consulta opciones de viaje entre Barcelona y Girona, con salida hacia proveedor asociado para disponibilidad real.',
    highlights: ['Trayecto frecuente', 'Bus y tren', 'Busqueda sencilla']
  },
  {
    slug: 'malaga-sevilla',
    title: 'Malaga - Sevilla en autobus',
    origin: 'Malaga',
    destination: 'Sevilla',
    type: 'autobus',
    description: 'Busca rutas entre Malaga y Sevilla y continua al proveedor asociado para revisar horarios y precios.',
    highlights: ['Andalucia', 'Autobus', 'Proveedor asociado']
  }
];

export function getRouteBySlug(slug: string) {
  return popularRoutes.find((route) => route.slug === slug);
}
