import Head from 'next/head';
import Link from 'next/link';

export default function Custom500() {
  return (
    <>
      <Head>
        <title>Error interno | ShareWay Pro</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="page-wrap results-page">
        <section className="results-hero">
          <p className="eyebrow">Error 500</p>
          <h1>Algo no ha salido bien.</h1>
          <p>Ha ocurrido un error interno. Puedes volver al inicio o intentar acceder a una seccion principal de ShareWay Pro.</p>
        </section>

        <section className="results-card">
          <div className="trip-meta">
            <span>ShareWay Pro</span>
            <span>Error interno</span>
            <span>500</span>
          </div>
          <div className="hero-actions">
            <Link className="primary-link" href="/">Volver al inicio</Link>
            <Link className="secondary-link" href="/rutas">Ver rutas</Link>
            <Link className="secondary-link" href="/contacto">Contacto</Link>
          </div>
        </section>
      </main>
    </>
  );
}
