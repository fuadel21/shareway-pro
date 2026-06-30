import Head from 'next/head';

const contactOptions = [
  {
    title: 'Solicitar un transfer',
    description: 'Para aeropuerto, estacion, hotel, evento o ruta privada. Completa los datos y envia la solicitud desde ShareWay Pro.',
    href: '/traslados',
    action: 'Ir a transfers'
  },
  {
    title: 'Explorar rutas',
    description: 'Consulta rutas populares de tren, autobus y traslados para preparar tu viaje o revisar opciones disponibles.',
    href: '/rutas',
    action: 'Ver rutas'
  },
  {
    title: 'Buscar viaje',
    description: 'Usa el buscador principal para preparar origen, destino, fecha y pasajeros antes de continuar.',
    href: '/#buscar',
    action: 'Buscar viaje'
  }
];

export default function ContactoPage() {
  return (
    <>
      <Head>
        <title>Contacto | ShareWay Pro</title>
        <meta name="description" content="Contacta con ShareWay Pro para transfers privados, rutas populares y busqueda de viajes." />
        <link rel="canonical" href="https://shareway.pro/contacto" />
      </Head>
      <main className="page-wrap contact-page">
        <section className="page-hero">
          <p className="eyebrow">Contacto</p>
          <h1>¿En que podemos ayudarte?</h1>
          <p>Elige el camino mas rapido segun lo que necesitas: solicitar un transfer, revisar rutas o preparar una busqueda de viaje.</p>
        </section>

        <section className="features pro-features contact-options">
          {contactOptions.map((item) => (
            <article className="feature-card" key={item.title}>
              <div className="feature-icon">→</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <a className="secondary-link inline-link" href={item.href}>{item.action}</a>
            </article>
          ))}
        </section>

        <section className="cta-section">
          <p className="eyebrow">Transfers</p>
          <h2>Para presupuestos, usa el formulario de traslados.</h2>
          <p>Asi recibimos origen, destino, fecha, hora, pasajeros y equipaje en un formato claro.</p>
          <div className="hero-actions center-actions">
            <a className="primary-link" href="/traslados">Solicitar presupuesto</a>
            <a className="secondary-link" href="/rutas">Ver rutas populares</a>
          </div>
        </section>
      </main>
    </>
  );
}
