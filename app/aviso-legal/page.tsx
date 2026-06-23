import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aviso legal',
  description: 'Aviso legal de ShareWay Pro.'
};

export default function AvisoLegalPage() {
  return (
    <main className="page-wrap legal-page">
      <h1>Aviso legal</h1>
      <p>Última actualización: 23 de junio de 2026.</p>
      <p>Esta página es una plantilla inicial y debe adaptarse con los datos fiscales reales del titular antes de lanzar campañas comerciales.</p>
      <h2>Titularidad</h2>
      <p>ShareWay Pro es un portal digital en fase inicial orientado a búsqueda de transporte, redirección a partners afiliados y captación de solicitudes de transfers.</p>
      <h2>Intermediación</h2>
      <p>Las reservas de trenes y autobuses pueden ser gestionadas por plataformas externas. ShareWay Pro no opera servicios ferroviarios ni de autobús.</p>
      <h2>Responsabilidad</h2>
      <p>Las condiciones finales de reserva, pago, cambios, cancelaciones y emisión de billetes serán las indicadas por el proveedor correspondiente.</p>
    </main>
  );
}
