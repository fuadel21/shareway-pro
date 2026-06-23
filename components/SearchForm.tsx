'use client';

import { FormEvent, useMemo, useState } from 'react';
import { buildOmioAffiliateUrl, TravelMode } from '@/lib/omio';

const modes: { value: TravelMode; label: string }[] = [
  { value: 'tren', label: 'Tren' },
  { value: 'autobus', label: 'Autobús' },
  { value: 'transfer', label: 'Transfer' }
];

export default function SearchForm({ defaultMode = 'tren' }: { defaultMode?: TravelMode }) {
  const [origin, setOrigin] = useState('Madrid');
  const [destination, setDestination] = useState('Valencia');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [mode, setMode] = useState<TravelMode>(defaultMode);
  const [error, setError] = useState('');
  const minDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!origin.trim() || !destination.trim() || !date) {
      setError('Indica origen, destino y fecha para continuar.');
      return;
    }

    if (mode === 'transfer') {
      const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@shareway.pro';
      const subject = encodeURIComponent(`Solicitud de transfer: ${origin} → ${destination}`);
      const body = encodeURIComponent(`Hola ShareWay Pro,\n\nQuiero solicitar un transfer.\n\nOrigen: ${origin}\nDestino: ${destination}\nFecha: ${date}\nPasajeros: ${passengers}\n\nGracias.`);
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      return;
    }

    const url = buildOmioAffiliateUrl({ origin, destination, date, passengers, mode });
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <form className="search-card" onSubmit={submit} aria-label="Buscador de viajes">
      <div className="mode-tabs" role="tablist" aria-label="Tipo de transporte">
        {modes.map((item) => (
          <button key={item.value} type="button" className={mode === item.value ? 'mode-tab active' : 'mode-tab'} onClick={() => setMode(item.value)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="form-grid">
        <label>Origen<input value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="Madrid" /></label>
        <label>Destino<input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Valencia" /></label>
        <label>Fecha<input type="date" value={date} min={minDate} onChange={(event) => setDate(event.target.value)} /></label>
        <label>Pasajeros<select value={passengers} onChange={(event) => setPassengers(event.target.value)}>{[1,2,3,4,5,6,7,8].map((number) => <option key={number} value={String(number)}>{number}</option>)}</select></label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      <button className="primary-button" type="submit">{mode === 'transfer' ? 'Solicitar transfer' : 'Buscar viaje'}</button>
      <p className="form-note">Trenes y autobuses se reservan mediante partner afiliado. Los transfers se gestionan por solicitud hasta activar reserva online.</p>
    </form>
  );
}
