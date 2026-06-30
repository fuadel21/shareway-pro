import Head from 'next/head';
import SearchForm from '@/components/SearchForm';

const busBenefits = [
  ['Busqueda sencilla', 'Introduce origen, destino, fecha y pasajeros para preparar la consulta.'],
  ['Rutas de ciudad', 'Util para trayectos frecuentes entre ciudades, estaciones y destinos turisticos.'],
  ['Salida externa', 'La disponibilidad, horarios y precios finales se consultan en el proveedor asociado.']
];

export default function AutobusesPage() {
  return (
    <>
      <Head>
        <title>Autobuses | ShareWay Pro</title>
        <meta name="description" content="Busca rutas de autobus desde ShareWay Pro y continua al proveedor asociado para revisar horarios, precios y disponibilidad." />
        <link rel="canonical" href="https://shareway.pro/autobuses" />
      </Head>
      <main className="page-wrap mode-page">
        <section className="page-hero">
          <p className="eyebrow">Autobuses</p>
          <h1>Busca viajes en autobus.</h1>
          <p>Consulta rutas de autobus desde ShareWay Pro y continua al proveedor asociado para ver horarios y precios reales.</p>
        </section>

        <section className="mode-search-section">
          <SearchForm defaultMode="autobus" />
        </section>

        <section className="features pro-features mode-features">
          {busBenefits.map(([title, description]) => (
            <article className="feature-card" key={title}>
              <div className="feature-icon">✓</div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </section>

        <section className="cta-section">
          <p className="eyebrow">Rutas</p>
          <h2>Encuentra rutas populares de autobus.</h2>
          <p>Empieza por trayectos frecuentes y usa el buscador para preparar tu consulta.</p>
          <div className="hero-actions center-actions">
            <a className="primary-link" href="/rutas">Ver rutas</a>
            <a className="secondary-link" href="/#buscar">Volver al buscador</a>
          </div>
        </section>
      </main>
    </>
  );
}
