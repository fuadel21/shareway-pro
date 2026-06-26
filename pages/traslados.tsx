export default function TrasladosPage() {
  const whatsappText = encodeURIComponent('Hola, quiero solicitar un presupuesto de transfer en ShareWay Pro. Origen: Destino: Fecha: Hora: Pasajeros: Maletas:');

  return (
    <main className="page-wrap">
      <section className="page-hero">
        <p className="eyebrow">Transfers privados</p>
        <h1>Solicita tu traslado.</h1>
        <p>Servicio para aeropuerto, estacion, hotel, eventos y rutas privadas. Envia origen, destino, fecha, hora, pasajeros y equipaje.</p>
      </section>
      <section className="content-section">
        <h2>Datos necesarios</h2>
        <ul className="clean-list">
          <li>Origen y destino exacto</li>
          <li>Fecha y hora de recogida</li>
          <li>Numero de pasajeros y maletas</li>
          <li>Vuelo, hotel o estacion si aplica</li>
        </ul>
      </section>
      <section className="cta-section">
        <p className="eyebrow">Presupuesto rapido</p>
        <h2>Contacto directo</h2>
        <p>Envia tu solicitud por la ruta interna de ShareWay Pro.</p>
        <div className="hero-actions center-actions">
          <a className="primary-link" href={`/whatsapp?text=${whatsappText}`}>Enviar por WhatsApp</a>
          <a className="secondary-link" href="/#buscar">Buscar otro viaje</a>
        </div>
      </section>
    </main>
  );
}
