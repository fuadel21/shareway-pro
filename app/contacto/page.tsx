import type { Metadata } from 'next';

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@shareway.pro';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Contacta con ShareWay Pro para afiliación, transfers y proveedores de transporte.'
};

export default function ContactoPage() {
  return (
    <main className="page-wrap">
      <section className="page-hero">
        <p className="eyebrow">Contacto</p>
        <h1>Hablemos de rutas, transfers y acuerdos de transporte.</h1>
        <p>Para proveedores, afiliación o solicitudes comerciales, escribe a <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
      </section>
      <section className="content-section">
        <h2>Email directo</h2>
        <p><a className="primary-link" href={`mailto:${contactEmail}?subject=Contacto%20ShareWay%20Pro`}>Enviar email</a></p>
      </section>
    </main>
  );
}
