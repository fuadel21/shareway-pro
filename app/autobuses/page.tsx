import type { Metadata } from 'next';
import SearchForm from '@/components/SearchForm';

export const metadata: Metadata = {
  title: 'Autobuses',
  description: 'Busca viajes en autobús desde ShareWay Pro mediante partners afiliados.'
};

export default function AutobusesPage() {
  return (
    <main className="page-wrap">
      <section className="page-hero">
        <p className="eyebrow">Autobuses</p>
        <h1>Encuentra plazas de autobús para viajes normales, eventos o rutas especiales.</h1>
        <p>Primero validamos tráfico con afiliación. Después se pueden añadir operadores locales, autocares y APIs B2B.</p>
      </section>
      <SearchForm defaultMode="autobus" />
      <section className="content-section">
        <h2>Casos de uso</h2>
        <ul className="clean-list">
          <li>Autobuses interurbanos</li>
          <li>Rutas para estudiantes y trabajadores</li>
          <li>Eventos y excursiones</li>
          <li>Minibuses y autocares privados</li>
        </ul>
      </section>
    </main>
  );
}
