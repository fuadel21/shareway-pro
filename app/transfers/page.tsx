import type { Metadata } from 'next';
import SearchForm from '@/components/SearchForm';

export const metadata: Metadata = {
  title: 'Transfers',
  description: 'Solicita transfers de aeropuerto, estación, hotel o eventos con ShareWay Pro.'
};

export default function TransfersPage() {
  return (
    <main className="page-wrap">
      <section className="page-hero">
        <p className="eyebrow">Transfers</p>
        <h1>Solicita transfers de aeropuerto, estación, hotel o eventos.</h1>
        <p>El MVP captura solicitudes por email. Más adelante se puede añadir disponibilidad, pago, proveedores y panel de reservas.</p>
      </section>
      <SearchForm defaultMode="transfer" />
      <section className="content-section">
        <h2>Servicios iniciales</h2>
        <ul className="clean-list">
          <li>Aeropuerto → hotel</li>
          <li>Estación → destino local</li>
          <li>Transfers para grupos</li>
          <li>Eventos, excursiones y rutas privadas</li>
        </ul>
      </section>
    </main>
  );
}
