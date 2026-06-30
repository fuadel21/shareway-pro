import Head from 'next/head';
import SearchForm from '@/components/SearchForm';

const trainBenefits = [
  ['Resumen previo', 'Prepara origen, destino, fecha y pasajeros antes de continuar al proveedor asociado.'],
  ['Rutas populares', 'Accede a trayectos frecuentes como Barcelona - Madrid o Madrid - Valencia.'],
  ['Modelo afiliado', 'ShareWay Pro puede derivar al usuario a proveedores externos para horarios y precios reales.']
];

export default function TrenesPage() {
  return (
    <>
      <Head>
        <title>Trenes | ShareWay Pro</title>
        <meta name="description" content="Busca viajes en tren desde ShareWay Pro y continua al proveedor asociado para consultar horarios, precios y disponibilidad." />
        <link rel="canonical" href="https://shareway.pro/trenes" />
      </Head>
      <main className="page-wrap mode-page">
        <section className="page-hero">
          <p className="eyebrow">Trenes</p>
          <h1>Busca viajes en tren.</h1>
          <p>Prepara tu busqueda de tren desde ShareWay Pro y continua al proveedor asociado para ver disponibilidad real.</p>
        </section>

        <section className="mode-search-section">
          <SearchForm defaultMode="tren" />
        </section>

        <section className="features pro-features mode-features">
          {trainBenefits.map(([title, description]) => (
            <article className="feature-card" key={title}>
              <div className="feature-icon">✓</div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </section>

        <section className="cta-section">
          <p className="eyebrow">Rutas</p>
          <h2>Consulta rutas populares en tren y bus.</h2>
          <p>Las rutas SEO ayudan a encontrar trayectos concretos y preparar la busqueda mas rapido.</p>
          <div className="hero-actions center-actions">
            <a className="primary-link" href="/rutas">Ver rutas</a>
            <a className="secondary-link" href="/#buscar">Volver al buscador</a>
          </div>
        </section>
      </main>
    </>
  );
}
