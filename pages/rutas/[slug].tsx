import type { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { getRouteBySlug, popularRoutes, type PopularRoute } from '@/lib/routes';

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

export default function RoutePage({ route }: { route: PopularRoute }) {
  const searchParams = new URLSearchParams({
    origin: route.origin,
    destination: route.destination,
    date: '',
    passengers: '1',
    mode: route.type === 'transfer' ? 'transfer' : route.type
  });

  const ctaHref = route.type === 'transfer' ? '/traslados' : `/#buscar`;

  return (
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
  );
}
