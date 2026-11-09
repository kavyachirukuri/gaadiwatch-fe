'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'rent' | 'buy';

export function SearchCard() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('rent');
  const [location, setLocation] = useState('Koramangala, Bengaluru');
  const [type, setType] = useState('scooter');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ location, type });
    router.push(`/${mode}?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, color: 'var(--ink)' }}>
      <div className="seg" role="group" aria-label="Rent or buy">
        <button type="button" className={mode === 'rent' ? 'on' : ''} aria-pressed={mode === 'rent'} onClick={() => setMode('rent')}>
          Rent
        </button>
        <button type="button" className={mode === 'buy' ? 'on' : ''} aria-pressed={mode === 'buy'} onClick={() => setMode('buy')}>
          Buy
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <div>
          <label className="lbl" htmlFor="h-loc">Location</label>
          <input id="h-loc" className="in" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <label className="lbl" htmlFor="h-type">Vehicle type</label>
          <select id="h-type" className="in" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="scooter">Scooter</option>
            <option value="bike">Bike</option>
            <option value="ev">EV</option>
            <option value="car">Car</option>
            {mode === 'buy' && (
              <>
                <option value="three_wheeler">3-wheeler</option>
                <option value="truck">Truck</option>
                <option value="lorry">Lorry</option>
              </>
            )}
          </select>
        </div>
        {mode === 'rent' ? (
          <>
            <div>
              <label className="lbl" htmlFor="h-from">Pick-up</label>
              <input id="h-from" className="in" type="datetime-local" />
            </div>
            <div>
              <label className="lbl" htmlFor="h-to">Return</label>
              <input id="h-to" className="in" type="datetime-local" />
            </div>
          </>
        ) : (
          <div>
            <label className="lbl" htmlFor="h-budget">Budget</label>
            <select id="h-budget" className="in" defaultValue="">
              <option value="">Any budget</option>
              <option value="0-50000">Under ₹50,000</option>
              <option value="50000-200000">₹50,000 – ₹2 lakh</option>
              <option value="200000-800000">₹2 – ₹8 lakh</option>
              <option value="800000-">Above ₹8 lakh</option>
            </select>
          </div>
        )}
      </div>

      <button type="submit" className="btn bp" style={{ alignSelf: 'flex-start' }}>
        Search vehicles
      </button>
    </form>
  );
}
