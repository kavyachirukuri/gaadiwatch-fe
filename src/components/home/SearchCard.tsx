'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { inrShort } from '@/lib/format';
import { typeOptions, useMeta } from '@/lib/use-meta';

type Mode = 'rent' | 'buy';

const BUDGETS: [number, number][] = [
  [0, 50000],
  [50000, 200000],
  [200000, 800000],
  [800000, 5000000],
];

export function SearchCard() {
  const router = useRouter();
  const { meta } = useMeta();
  const [mode, setMode] = useState<Mode>('rent');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('any');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [budget, setBudget] = useState('');

  // Suggested default location: first area of the first city in the database
  const firstCity = meta?.cities[0];
  const firstArea = meta?.areas.find((a) => a.city === firstCity?.key);
  const placeholder = firstArea && firstCity ? `${firstArea.name}, ${firstCity.name}` : 'Area or city';
  const cityName = (key: string) => meta?.cities.find((c) => c.key === key)?.name ?? key;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ location: location || placeholder, type });
    if (mode === 'rent' && from) params.set('from', from);
    if (mode === 'rent' && to) params.set('to', to);
    if (mode === 'buy' && budget) params.set('budget', budget);
    router.push(`/${mode}?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, color: 'var(--ink)' }}>
      <div className="seg" role="group" aria-label="Rent or buy">
        <button type="button" className={mode === 'rent' ? 'on' : ''} aria-pressed={mode === 'rent'} onClick={() => { setMode('rent'); setType('any'); }}>
          Rent
        </button>
        <button type="button" className={mode === 'buy' ? 'on' : ''} aria-pressed={mode === 'buy'} onClick={() => { setMode('buy'); setType('any'); }}>
          Buy
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <div>
          <label className="lbl" htmlFor="h-loc">Location</label>
          <input id="h-loc" className="in" value={location} placeholder={placeholder} onChange={(e) => setLocation(e.target.value)} list="h-areas" />
          <datalist id="h-areas">
            {meta?.areas.map((a) => <option key={`${a.city}-${a.name}`} value={`${a.name}, ${cityName(a.city)}`} />)}
          </datalist>
        </div>
        <div>
          <label className="lbl" htmlFor="h-type">Vehicle type</label>
          <select id="h-type" className="in" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="any">Any vehicle</option>
            {typeOptions(meta, mode).map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        {mode === 'rent' ? (
          <>
            <div>
              <label className="lbl" htmlFor="h-from">Pick-up</label>
              <input id="h-from" className="in" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="lbl" htmlFor="h-to">Return</label>
              <input id="h-to" className="in" type="datetime-local" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </div>
          </>
        ) : (
          <div>
            <label className="lbl" htmlFor="h-budget">Budget</label>
            <select id="h-budget" className="in" value={budget} onChange={(e) => setBudget(e.target.value)}>
              <option value="">Any budget</option>
              {BUDGETS.map(([lo, hi]) => (
                <option key={lo} value={`${lo}-${hi}`}>
                  {lo === 0 ? `Under ${inrShort(hi)}` : hi >= 5000000 ? `Above ${inrShort(lo)}` : `${inrShort(lo)} – ${inrShort(hi)}`}
                </option>
              ))}
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
