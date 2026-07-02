import Head from 'next/head';
import Link from 'next/link';
import { popularRoutes, type PopularRoute, type RouteType } from '@/lib/routes';

const routeGroups: { type: RouteType; label: string; title: string; description: string }[] = [
  {
    type: 'transfer',
    label: 'Transfers',
    title: 'Transfers privados y aeropuertos',
    description: 'Rutas para solicitar presupuesto de traslado privado hacia aeropuertos, hoteles, estaciones y Costa Brava.'
  },
  {
    type: 'tren',
    label: 'Trenes',
    title: 'Rutas populares en tren',
    description: 'Trayectos frecuentes para preparar la busqueda y continuar al proveedor asociado.'
  },
  {
    type: 'autobus',
    label: 'Autobuses',
    title: 'Rutas populares en autobus',
    description: 'Conexiones entre ciudades y destinos turisticos para consultar disponibilidad externa.'
  }
];

function RouteCard({ route }: { route: PopularRoute }) {
  return (
    <article className="route-card">
      <div>
        <span>{route.type === 'transfer' ? 'Transfer' : route.type === 'tren' ? 'Tren' : 'Autobus'}</span>
        <h3>{route.origin} → {route.destination}</h3>
        <p>{route.description}</p>
      </div>
      <Link href={`/rutas/${route.slug}`}>Ver ruta</Link>
    </article>
  );
}

export default function RutasPage() {
  return (
    <>
      <Head>
        <title>Rutas populares | ShareWay Pro</title>
        <meta name="description" content="Listado de rutas populares de ShareWay Pro para trenes, autobuses y transfers privados hacia aeropuertos, ciudades y Costa Brava." />
        <link rel="canonical" href="https://shareway.pro/rutas" />
      </Head>
      <main className="page-wrap routes-index-page">
        <section className="page-hero">
          <p className="eyebrow">Rutas populares</p>
          <h1>Rutas de tren, autobus y transfers.</h1>
          <p>Explora rutas preparadas para busqueda, afiliados y solicitudes de traslado privado.</p>
        </section>

        <section className="route-category-nav" aria-label="Categorias de rutas">
          {routeGroups.map((group) => (
            <a key={group.type} href={`#${group.type}`}>{group.label}</a>
          ))}
        </section>

        {routeGroups.map((group) => {
          const routes = popularRoutes.filter((route) => route.type === group.type);

          return (
            <section className="route-category-block" id={group.type} key={group.type}>
              <div className="section-heading">
                <p className="eyebrow">{group.label}</p>
                <h2>{group.title}</h2>
                <p>{group.description}</p>
              </div>
              <div className="route-grid route-index-grid">
                {routes.map((route) => <RouteCard route={route} key={route.slug} />)}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
