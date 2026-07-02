import Head from 'next/head';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

const faqs = [
  ['¿El precio se confirma al momento?', 'No. Primero envias la solicitud y despues se confirma disponibilidad, vehiculo y precio final.'],
  ['¿Sirve para aeropuertos y estaciones?', 'Si. Puedes solicitar recogidas en aeropuerto, estacion, hotel, apartamento o direccion privada.'],
  ['¿Puedo pedir ida y vuelta?', 'Si. Indica la vuelta en el campo de notas con fecha, hora y punto de recogida.'],
  ['¿Por que se piden maletas?', 'El equipaje ayuda a elegir el vehiculo adecuado, especialmente si viajan varias personas.']
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(([question, answer]) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: answer
    }
  }))
};

export default function TrasladosPage() {
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [bags, setBags] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const whatsappStatus = first(router.query.whatsapp);

  useEffect(() => {
    if (!router.isReady) return;
    setOrigin(first(router.query.origin));
    setDestination(first(router.query.destination));
    setDate(first(router.query.date));
    setPassengers(first(router.query.passengers) || '1');
  }, [router.isReady, router.query.origin, router.query.destination, router.query.date, router.query.passengers]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!origin || !destination || !date || !time) {
      setError('Completa origen, destino, fecha y hora para solicitar el presupuesto.');
      return;
    }

    const text = [
      'Hola, quiero solicitar un presupuesto de transfer en ShareWay Pro.',
      `Origen: ${origin}`,
      `Destino: ${destination}`,
      `Fecha: ${date}`,
      `Hora: ${time}`,
      `Pasajeros: ${passengers}`,
      `Maletas: ${bags || 'No indicado'}`,
      `Notas: ${notes || 'Sin notas'}`
    ].join('\n');

    window.location.href = `/whatsapp?text=${encodeURIComponent(text)}`;
  }

  return (
    <>
      <Head>
        <title>Transfers privados | ShareWay Pro</title>
        <meta name="description" content="Solicita presupuesto para transfers privados a aeropuertos, estaciones, hoteles y rutas de Costa Brava desde ShareWay Pro." />
        <link rel="canonical" href="https://shareway.pro/traslados" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      </Head>
      <main className="page-wrap transfer-page">
        <section className="page-hero">
          <p className="eyebrow">Transfers privados</p>
          <h1>Solicita tu traslado.</h1>
          <p>Servicio para aeropuerto, estacion, hotel, eventos y rutas privadas. Envia origen, destino, fecha, hora, pasajeros y equipaje.</p>
        </section>

        {whatsappStatus === 'missing' ? (
          <div className="config-warning">
            <strong>WhatsApp no esta configurado en Vercel.</strong>
            <p>Anade la variable WHATSAPP_TRANSFER_URL en Production y haz Redeploy.</p>
          </div>
        ) : null}

        <section className="transfer-layout">
          <form className="search-card transfer-form" onSubmit={submit}>
            <div className="form-grid">
              <label>Origen<input value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="Aeropuerto, hotel o ciudad" /></label>
              <label>Destino<input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Destino exacto" /></label>
              <label>Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <label>Hora<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
              <label>Pasajeros<select value={passengers} onChange={(event) => setPassengers(event.target.value)}>{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
              <label>Maletas<input value={bags} onChange={(event) => setBags(event.target.value)} placeholder="Ej. 2 grandes y 1 cabina" /></label>
            </div>
            <label className="full-label">Notas<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Vuelo, hotel, silla infantil, ida y vuelta..." /></label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="primary-button" type="submit">Solicitar presupuesto por WhatsApp</button>
            <p className="form-note">La solicitud se envia por la ruta interna de ShareWay Pro. El presupuesto se confirma manualmente.</p>
          </form>

          <aside className="content-section transfer-info">
            <h2>Datos necesarios</h2>
            <ul className="clean-list">
              <li>Origen y destino exacto</li>
              <li>Fecha y hora de recogida</li>
              <li>Numero de pasajeros y maletas</li>
              <li>Vuelo, hotel o estacion si aplica</li>
            </ul>
          </aside>
        </section>

        <section className="content-section faq-section">
          <p className="eyebrow">Preguntas frecuentes</p>
          <h2>Antes de pedir tu transfer</h2>
          <div className="faq-grid">
            {faqs.map(([question, answer]) => (
              <article className="faq-item" key={question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
