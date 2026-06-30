import Head from 'next/head';

export default function PrivacidadPage() {
  return (
    <>
      <Head>
        <title>Privacidad | ShareWay Pro</title>
        <meta name="description" content="Politica de privacidad de ShareWay Pro." />
        <link rel="canonical" href="https://shareway.pro/privacidad" />
      </Head>
      <main className="page-wrap legal-page">
        <p className="eyebrow">Privacidad</p>
        <h1>Politica de privacidad</h1>
        <section className="content-section">
          <h2>Datos que puedes enviar</h2>
          <p>Cuando solicitas un transfer, puedes enviar datos como origen, destino, fecha, hora, pasajeros, equipaje y notas adicionales.</p>
        </section>
        <section className="content-section">
          <h2>Finalidad</h2>
          <p>Estos datos se usan para preparar o responder una solicitud de presupuesto y gestionar la comunicacion relacionada con el servicio solicitado.</p>
        </section>
        <section className="content-section">
          <h2>Proveedores externos</h2>
          <p>ShareWay Pro puede enviar al usuario a proveedores externos para consultar disponibilidad, precios o completar una reserva. Cada proveedor puede aplicar sus propias condiciones y politica de privacidad.</p>
        </section>
        <section className="content-section">
          <h2>Actualizacion</h2>
          <p>Esta pagina es una base inicial y debe revisarse con los datos definitivos del titular, proveedores usados y herramientas de analitica activas.</p>
        </section>
      </main>
    </>
  );
}
