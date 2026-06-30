import Head from 'next/head';

export default function AvisoLegalPage() {
  return (
    <>
      <Head>
        <title>Aviso legal | ShareWay Pro</title>
        <meta name="description" content="Aviso legal de ShareWay Pro, portal independiente de busqueda de viajes y solicitudes de transfers." />
        <link rel="canonical" href="https://shareway.pro/aviso-legal" />
      </Head>
      <main className="page-wrap legal-page">
        <p className="eyebrow">Informacion legal</p>
        <h1>Aviso legal</h1>
        <section className="content-section">
          <h2>Titularidad del sitio</h2>
          <p>ShareWay Pro es un portal independiente orientado a busqueda de viajes, rutas populares y solicitudes de transfers privados.</p>
          <p>Los datos fiscales y de titularidad definitiva deben completarse antes del lanzamiento comercial completo.</p>
        </section>
        <section className="content-section">
          <h2>Actividad</h2>
          <p>El sitio puede facilitar acceso a proveedores externos, enlaces de afiliado o canales de contacto para presupuestos de traslado. La reserva, disponibilidad y precio final pueden depender del proveedor correspondiente.</p>
        </section>
        <section className="content-section">
          <h2>Responsabilidad</h2>
          <p>La informacion publicada se ofrece con finalidad informativa y puede cambiar. Antes de contratar un servicio, el usuario debe revisar las condiciones finales del proveedor o confirmacion recibida.</p>
        </section>
      </main>
    </>
  );
}
