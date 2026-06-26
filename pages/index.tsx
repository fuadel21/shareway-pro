import Head from 'next/head';
import SearchForm from '@/components/SearchForm';
import { popularRoutes } from '@/lib/routes';

const benefits = [
  ['Comparador rápido', 'Centraliza trenes, autobuses y transfers en una experiencia sencilla.'],
  ['Preparado para afiliados', 'Listo para conectar deeplinks, widgets y futuras integraciones B2B.'],
  ['Transfers bajo solicitud', 'Captación directa para aeropuertos, hoteles, estaciones y eventos.']
];

export default function HomePage() {
  return (
    <>
      <Head>
        <title>ShareWay Pro | Tren, autobus y transfers</title>
        <meta name="description" content="Busca trenes, autobuses y transfers desde ShareWay Pro. Rutas populares, solicitudes de traslado y salida a proveedores asociados." />
        <link rel="canonical" href="https://shareway.pro" />
        <meta property="og:title" content="ShareWay Pro | Tren, autobus y transfers" />
        <meta property="og:description" content="Portal independiente para buscar viajes, preparar rutas y solicitar transfers privados." />
        <meta property="og:url" content="https://shareway.pro" />
        <meta property="og:type" content="website" />
      </Head>
      <main>
        <section className="hero pro-hero">
          <div className="hero-copy">
            <p className="eyebrow">ShareWay Pro</p>
            <h1>Busca tren, autobús o transfer sin perder tiempo.</h1>
            <p className="hero-lead">Un portal independiente para comparar viajes, captar solicitudes de traslado y preparar futuras integraciones con operadores de movilidad.</p>
            <div className="hero-actions">
              <a className="primary-link" href="#buscar">Buscar viaje</a>
              <a className="secondary-link" href="#rutas">Ver rutas populares</a>
            </div>
            <div className="trust-row" aria-label="Ventajas principales">
              <span>Afiliados</span>
              <span>Transfers</span>
              <span>España y Europa</span>
            </div>
          </div>
          <div id="buscar" className="search-shell">
            <div className="search-label">Busca tu próximo trayecto</div>
            <SearchForm />
          </div>
        </section>

        <section className="stats compact-stats" aria-label="Resumen de la plataforma">
          <div className="stat-card"><strong>3</strong><span>modos de viaje</span></div>
          <div className="stat-card"><strong>24/7</strong><span>captación online</span></div>
          <div className="stat-card"><strong>PRO</strong><span>dominio independiente</span></div>
        </section>

        <section className="section-block" id="rutas">
          <div className="section-heading">
            <p className="eyebrow">Rutas populares</p>
            <h2>Empieza con las búsquedas que más convierten.</h2>
            <p>Una estructura pensada para SEO, enlaces de afiliado y solicitudes de transfers locales.</p>
          </div>
          <div className="route-grid">
            {popularRoutes.map((route) => (
              <article className="route-card" key={route.slug}>
                <div>
                  <span>{route.type === 'transfer' ? 'Transfer' : route.type === 'tren' ? 'Tren' : 'Autobús'}</span>
                  <h3>{route.origin} → {route.destination}</h3>
                </div>
                <a href={`/rutas/${route.slug}`}>Ver ruta</a>
              </article>
            ))}
          </div>
        </section>

        <section className="split-section">
          <div className="content-panel dark-panel">
            <p className="eyebrow">Transfers</p>
            <h2>Aeropuerto, estación, hotel o evento.</h2>
            <p>La parte de transfers puede funcionar desde el primer día como captación directa: el usuario pide presupuesto y tú decides si operarlo, subcontratarlo o derivarlo.</p>
            <a className="light-link" href="/traslados">Solicitar transfer</a>
          </div>
          <div className="content-panel">
            <p className="eyebrow">Afiliados</p>
            <h2>Trenes y autobuses sin revender billetes.</h2>
            <p>La web está preparada para trabajar con enlaces externos, widgets o deeplinks. Así puedes validar tráfico antes de pedir una API o acuerdo B2B.</p>
            <a className="secondary-link inline-link" href="/trenes">Ver trenes</a>
          </div>
        </section>

        <section className="features pro-features">
          {benefits.map(([title, description]) => (
            <article className="feature-card" key={title}>
              <div className="feature-icon">✓</div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </section>

        <section className="cta-section">
          <p className="eyebrow">Siguiente fase</p>
          <h2>Ahora toca convertir tráfico en solicitudes reales.</h2>
          <p>Podemos añadir páginas SEO por ciudad, formulario avanzado de transfer, WhatsApp, analítica y enlaces de afiliado reales.</p>
          <div className="hero-actions center-actions">
            <a className="primary-link" href="#buscar">Probar buscador</a>
            <a className="secondary-link" href="/contacto">Contacto</a>
          </div>
        </section>
      </main>
    </>
  );
}
