'use client';

import { FormEvent, useState } from 'react';
import { buildOmioAffiliateUrl, TravelMode } from '@/lib/omio';

export default function SearchForm({ defaultMode = 'tren' }: { defaultMode?: TravelMode }) {
  const [origin, setOrigin] = useState('Madrid');
  const [destination, setDestination] = useState('Valencia');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [mode, setMode] = useState<TravelMode>(defaultMode);
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!origin || !destination || !date) {
      setError('Indica origen, destino y fecha.');
      return;
    }
    if (mode === 'transfer') {
      window.location.href = '/contacto';
      return;
    }
    window.open(buildOmioAffiliateUrl({ origin, destination, date, passengers, mode }), '_blank', 'noopener,noreferrer');
  }

  return (
    <form className="search-card" onSubmit={submit}>
      <div className="mode-tabs">
        {(['tren', 'autobus', 'transfer'] as TravelMode[]).map((item) => (
          <button key={item} type="button" className={mode === item ? 'mode-tab active' : 'mode-tab'} onClick={() => setMode(item)}>
            {item === 'autobus' ? 'Autobús' : item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      <div className="form-grid">
        <label>Origen<input value={origin} onChange={(event) => setOrigin(event.target.value)} /></label>
        <label>Destino<input value={destination} onChange={(event) => setDestination(event.target.value)} /></label>
        <label>Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label>Pasajeros<select value={passengers} onChange={(event) => setPassengers(event.target.value)}>{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="primary-button" type="submit">{mode === 'transfer' ? 'Solicitar transfer' : 'Buscar viaje'}</button>
      <p className="form-note">Trenes y autobuses abren el enlace de afiliado. Transfers llevan a contacto.</p>
    </form>
  );
}
