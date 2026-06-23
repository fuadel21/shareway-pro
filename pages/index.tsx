import SearchForm from '@/components/SearchForm';

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">ShareWay Pro</p>
          <h1>Trenes, autobuses y transfers desde una sola web.</h1>
          <p>Web independiente para shareway.pro, preparada para enlaces de afiliado y solicitudes de transfer.</p>
          <div className="hero-actions">
            <a className="primary-link" href="#buscar">Buscar viaje</a>
            <a className="secondary-link" href="/transfers">Solicitar transfer</a>
          </div>
        </div>
        <div id="buscar"><SearchForm /></div>
      </section>
      <section className="features">
        <article className="feature-card"><h3>Trenes y autobuses</h3><p>El usuario busca ruta y fecha, y se abre el enlace de afiliado.</p></article>
        <article className="feature-card"><h3>Transfers</h3><p>Captación inicial de solicitudes para aeropuerto, estación, hoteles y eventos.</p></article>
        <article className="feature-card"><h3>Escalable</h3><p>Preparado para widget, Search API, white label o Booking API en una fase posterior.</p></article>
      </section>
    </main>
  );
}
