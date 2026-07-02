import type { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { getRouteBySlug, popularRoutes, type PopularRoute } from '@/lib/routes';

const SITE_URL = 'https://shareway.pro';

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: popularRoutes.map((route) => ({ params: { slug: route.slug } })),
  fallback: false
});

export const getStaticProps: GetStaticProps<{ route: PopularRoute }> = async ({ params }) => {
  const slug = String(params?.slug || '');
  const route = getRouteBySlug(slug);

  if (!route) {
    return { notFound: true };
  }

  return { props: { route } };
};

function buildRouteSchema(route: PopularRoute, canonical: string) {
  const modeLabel = route.type === 'transfer' ? 'Transfer privado' : route.type === 'tren' ? 'Tren' : 'Autobus';

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: route.title,
    description: route.description,
    url: canonical,
    isPartOf: {
      '@type': 'WebSite',
      name: 'ShareWay Pro',
      url: SITE_URL
    },
    about: {
      '@type': 'TravelAction',
      name: `${modeLabel}: ${route.origin} a ${route.destination}`,
      fromLocation: {
        '@type': 'Place',
        name: route.origin
      },
      toLocation: {
        '@type': 'Place',
        name: route.destination
      },
      instrument: modeLabel
    }
  };
}

export default function RoutePage({ route }: { route: PopularRoute }) {
  const searchParams = new URLSearchParams({
    origin: route.origin,
    destination: route.destination,
    date: '',
    passengers: '1',
    mode: route.type === 'transfer' ? 'transfer' : route.type
  });

  const ctaHref = route.type === 'transfer' ? '/traslados' : `/#buscar`;
  const title = `${route.title} | ShareWay Pro`;
  const canonical = `${SITE_URL}/rutas/${route.slug}`;
  const schema = buildRouteSchema(route, canonical);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={route.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={route.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      </Head>
      <main className="page-wrap route-page">
        <section className="page-hero">
          <p className="eyebrow">Ruta popular</p>
          <h1>{route.title}</h1>
          <p>{route.description}</p>
          <div className="hero-actions">
            <Link className="primary-link" href={ctaHref}>{route.type === 'transfer' ? 'Solicitar transfer' : 'Buscar viaje'}</Link>
            <Link className="secondary-link" href="/">Volver al inicio</Link>
          </div>
        </section>

        <section className="results-card">
          <div className="trip-line">
            <div><span>Origen</span><strong>{route.origin}</strong></div>
            <div className="trip-arrow">→</div>
            <div><span>Destino</span><strong>{route.destination}</strong></div>
          </div>
          <div className="trip-meta">
            <span>{route.type === 'transfer' ? 'Transfer privado' : route.type === 'tren' ? 'Tren' : 'Autobus'}</span>
            <span>ShareWay Pro</span>
            <span>Ruta SEO</span>
          </div>
        </section>

        <section className="content-section route-copy">
          <h2>Informacion de la ruta</h2>
          <p>{route.description}</p>
          <p>Esta pagina esta pensada para usuarios que buscan una ruta concreta y necesitan decidir si continuar con tren, autobus o solicitar un traslado privado.</p>
        </section>

        <section className="features pro-features route-features">
          {route.highlights.map((item) => (
            <article className="feature-card" key={item}>
              <div className="feature-icon">✓</div>
              <h3>{item}</h3>
              <p>Pagina preparada para captar trafico organico y dirigirlo hacia busqueda o solicitud.</p>
            </article>
          ))}
        </section>

        <section className="cta-section">
          <p className="eyebrow">Siguiente paso</p>
          <h2>{route.type === 'transfer' ? 'Pide presupuesto para esta ruta.' : 'Busca horarios y opciones disponibles.'}</h2>
          <p>ShareWay Pro te ayuda a preparar la busqueda antes de continuar al proveedor o solicitar traslado.</p>
          <div className="hero-actions center-actions">
            <Link className="primary-link" href={ctaHref}>{route.type === 'transfer' ? 'Solicitar traslado' : 'Buscar ahora'}</Link>
            <Link className="secondary-link" href={`/buscar?${searchParams.toString()}`}>Ver resumen</Link>
          </div>
        </section>
      </main>
    </>
  );
}
