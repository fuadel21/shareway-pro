import { useRouter } from 'next/router';

export default function BuscarPage() {
  const router = useRouter();
  const origin = String(router.query.origin || 'Origen');
  const destination = String(router.query.destination || 'Destino');
  const date = String(router.query.date || '');
  const passengers = String(router.query.passengers || '1');
  const mode = String(router.query.mode || 'tren');
  const modeLabel = mode === 'autobus' ? 'Autobús' : mode === 'tren' ? 'Tren' : 'Viaje';
  const params = new URLSearchParams({ origin, destination, date, passengers, mode });
  const omioUrl = `/go/omio?${params.toString()}`;

  return (
    <main className="page-wrap results-page">
      <section className="results-hero">
        <p className="eyebrow">Resultados preparados</p>
        <h1>{modeLabel} de {origin} a {destination}</h1>
        <p>Hemos preparado tu búsqueda. Para ver horarios, precios y disponibilidad real, continúa al proveedor asociado.</p>
      </section>
      <section className="results-card">
        <div className="trip-line">
          <div><span>Origen</span><strong>{origin}</strong></div>
          <div className="trip-arrow">→</div>
          <div><span>Destino</span><strong>{destination}</strong></div>
        </div>
        <div className="trip-meta">
          <span>{date || 'Fecha pendiente'}</span>
          <span>{passengers} pasajero{passengers === '1' ? '' : 's'}</span>
          <span>{modeLabel}</span>
        </div>
        <a className="primary-link big-action" href={omioUrl} target="_blank" rel="noopener noreferrer">Ver opciones en Omio</a>
        <a className="secondary-link big-action" href="/#buscar">Modificar búsqueda</a>
        <p className="form-note">ShareWay Pro puede recibir una comisión si reservas desde el proveedor asociado. El precio final y la reserva se gestionan fuera de ShareWay Pro.</p>
      </section>
    </main>
  );
}
