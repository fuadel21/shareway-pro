import Head from 'next/head';
import Link from 'next/link';
import { popularRoutes } from '@/lib/routes';

export default function RutasPage() {
  return (
    <>
      <Head>
        <title>Rutas populares | ShareWay Pro</title>
        <meta name="description" content="Listado de rutas populares de ShareWay Pro para trenes, autobuses y transfers privados hacia aeropuertos, ciudades y Costa Brava." />
        <link rel="canonical" href="https://shareway.pro/rutas" />
      </Head>
      <main className="page-wrap">
        <section className="page-hero">
          <p className="eyebrow">Rutas populares</p>
          <h1>Rutas de tren, autobus y transfers.</h1>
          <p>Explora rutas preparadas para busqueda, afiliados y solicitudes de traslado privado.</p>
        </section>

        <section className="route-grid route-index-grid">
          {popularRoutes.map((route) => (
            <article className="route-card" key={route.slug}>
              <div>
                <span>{route.type === 'transfer' ? 'Transfer' : route.type === 'tren' ? 'Tren' : 'Autobus'}</span>
                <h3>{route.origin} → {route.destination}</h3>
                <p>{route.description}</p>
              </div>
              <Link href={`/rutas/${route.slug}`}>Ver ruta</Link>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
