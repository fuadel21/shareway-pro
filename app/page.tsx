import SearchForm from '@/components/SearchForm';

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">ShareWay Pro</p>
          <h1>Trenes, autobuses y transfers desde una sola web.</h1>
          <p>
            Web independiente para `shareway.pro`, preparada para empezar con afiliados, deeplinks o widget, y evolucionar después hacia Search API y acuerdos B2B.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="#buscar">Buscar viaje</a>
            <a className="secondary-link" href="/transfers">Solicitar transfer</a>
          </div>
        </div>
        <div id="buscar">
          <SearchForm />
        </div>
      </section>

      <section className="stats" aria-label="Resumen del MVP">
        <div className="stat-card"><strong>01</strong><span>Afiliados y deeplinks primero</span></div>
        <div className="stat-card"><strong>02</strong><span>Transfers por solicitud</span></div>
        <div className="stat-card"><strong>03</strong><span>Preparado para API futura</span></div>
      </section>

      <section className="features">
        <article className="feature-card">
          <h3>Trenes y autobuses</h3>
          <p>El usuario busca ruta y fecha; ShareWay Pro lo dirige al partner afiliado para completar la reserva.</p>
        </article>
        <article className="feature-card">
          <h3>Transfers</h3>
          <p>Captación inicial por email para aeropuerto, estación, hotel, eventos y rutas privadas.</p>
        </article>
        <article className="feature-card">
          <h3>Escalable</h3>
          <p>La estructura permite pasar de links afiliados a widgets, Search API, white label o Booking API.</p>
        </article>
      </section>
    </main>
  );
}
