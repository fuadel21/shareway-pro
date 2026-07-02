import Head from 'next/head';
import Link from 'next/link';

export default function Custom404() {
  return (
    <>
      <Head>
        <title>Pagina no encontrada | ShareWay Pro</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="page-wrap results-page">
        <section className="results-hero">
          <p className="eyebrow">Error 404</p>
          <h1>Pagina no encontrada.</h1>
          <p>La direccion que has abierto no existe o se ha movido. Puedes volver a una seccion principal de ShareWay Pro.</p>
        </section>

        <section className="results-card">
          <div className="trip-meta">
            <span>ShareWay Pro</span>
            <span>Ruta no disponible</span>
            <span>404</span>
          </div>
          <div className="hero-actions">
            <Link className="primary-link" href="/">Volver al inicio</Link>
            <Link className="secondary-link" href="/rutas">Ver rutas</Link>
            <Link className="secondary-link" href="/traslados">Solicitar transfer</Link>
          </div>
        </section>
      </main>
    </>
  );
}
