import type { Metadata } from 'next';
import SearchForm from '@/components/SearchForm';

export const metadata: Metadata = {
  title: 'Trenes',
  description: 'Busca viajes en tren desde ShareWay Pro mediante partners afiliados.'
};

export default function TrenesPage() {
  return (
    <main className="page-wrap">
      <section className="page-hero">
        <p className="eyebrow">Trenes</p>
        <h1>Busca rutas de tren y reserva con nuestro partner afiliado.</h1>
        <p>ShareWay Pro empieza como portal afiliado para validar demanda antes de integrar APIs más avanzadas.</p>
      </section>
      <SearchForm defaultMode="tren" />
      <section className="content-section">
        <h2>Rutas iniciales</h2>
        <ul className="clean-list">
          <li>Madrid → Barcelona</li>
          <li>Madrid → Valencia</li>
          <li>Sevilla → Málaga</li>
          <li>Barcelona → Zaragoza</li>
        </ul>
      </section>
    </main>
  );
}
