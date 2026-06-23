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
            <a className="secondary-link" href="/traslados">Solicitar transfer</a>
          </div>
        </div>
        <div id="buscar"><SearchForm /></div>
      </section>
    </main>
  );
}
