import Head from 'next/head';

export default function CookiesPage() {
  return (
    <>
      <Head>
        <title>Cookies | ShareWay Pro</title>
        <meta name="description" content="Informacion sobre cookies y tecnologias similares en ShareWay Pro." />
        <link rel="canonical" href="https://shareway.pro/cookies" />
      </Head>
      <main className="page-wrap legal-page">
        <p className="eyebrow">Cookies</p>
        <h1>Politica de cookies</h1>
        <section className="content-section">
          <h2>Uso actual</h2>
          <p>ShareWay Pro puede usar cookies o tecnologias similares para funcionamiento tecnico, medicion y mejora del servicio cuando estas herramientas esten activadas.</p>
        </section>
        <section className="content-section">
          <h2>Analitica</h2>
          <p>Si se activa una herramienta de analitica, se podran medir visitas, paginas consultadas y acciones agregadas para mejorar la web.</p>
        </section>
        <section className="content-section">
          <h2>Proveedores externos</h2>
          <p>Al salir hacia proveedores asociados, plataformas de reserva o canales de contacto externos, esos servicios pueden aplicar sus propias cookies y condiciones.</p>
        </section>
        <section className="content-section">
          <h2>Revision pendiente</h2>
          <p>Esta politica debe ajustarse cuando se activen herramientas concretas de analitica, publicidad, afiliacion o seguimiento.</p>
        </section>
      </main>
    </>
  );
}
