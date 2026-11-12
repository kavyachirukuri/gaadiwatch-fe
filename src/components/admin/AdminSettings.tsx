'use client';

import { useState } from 'react';
import { api, errorMessage } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { useStaff } from './AdminShell';

type Area = { id: string; city: string; name: string; lat: number; lng: number; active: boolean };
type Settings = { settings: Record<string, unknown>; editable: { numbers: string[]; json: string[] }; areas: Area[] };
type Category = { key: string; label: string; rent: boolean; buy: boolean };
type City = { key: string; name: string; state?: string; rules?: string; status?: string; radiusKm?: number };

// How each number setting is shown: label, unit, and whether it's a percentage stored as a fraction
const FEES: { key: string; label: string; unit: string; percent?: boolean }[] = [
  { key: 'commission_rate', label: 'Rental commission (owner)', unit: '%', percent: true },
  { key: 'booking_fee', label: 'Renter booking fee', unit: '₹' },
  { key: 'gst_rate_on_fees', label: 'GST on platform fees', unit: '%', percent: true },
  { key: 'tcs_rate', label: 'TCS on payouts', unit: '%', percent: true },
  { key: 'sale_boost_fee', label: 'Sale listing boost (7 days)', unit: '₹' },
  { key: 'sale_success_fee', label: 'Sale success fee', unit: '₹' },
  { key: 'gps_device_fee', label: 'GPS device + fitting', unit: '₹' },
  { key: 'gps_monthly_fee', label: 'GPS monthly plan', unit: '₹' },
  { key: 'damage_protection_per_day', label: 'Damage protection (renter, per day)', unit: '₹' },
  { key: 'damage_protection_cap', label: 'Damage protection cap', unit: '₹' },
  { key: 'inspection_fee', label: 'Inspection & RC transfer help', unit: '₹' },
  { key: 'launch_offer_months', label: 'Launch offer: zero commission for', unit: 'months' },
  { key: 'request_reply_hours', label: 'Owner reply window', unit: 'hours' },
  { key: 'deposit_settlement_hours', label: 'Deposit settlement deadline', unit: 'hours' },
  { key: 'dispute_sla_hours', label: 'Dispute decision SLA', unit: 'hours' },
  { key: 'min_listing_photos', label: 'Minimum listing photos', unit: 'photos' },
];

export function AdminSettings() {
  const staff = useStaff();
  const { data, setData } = useApi<Settings>('/admin/settings', { staff: true });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const isAdmin = staff.role === 'admin';
  if (!data) return <p className="mut">Loading…</p>;
  const st = data.settings;
  const categories = (st.vehicle_categories as Category[]) ?? [];
  const cities = (st.cities as City[]) ?? [];
  const planned = (st.planned_cities as City[]) ?? [];
  const licence = (st.licence_classes as Record<string, string>) ?? {};

  const shown = (f: (typeof FEES)[number]) => {
    if (draft[f.key] !== undefined) return draft[f.key];
    const v = Number(st[f.key] ?? 0);
    return String(f.percent ? Math.round(v * 10000) / 100 : v);
  };

  async function save(key: string, value: unknown) {
    setErr(null);
    setMsg(null);
    try {
      setData(await api<Settings>(`/admin/settings/${key}`, { method: 'PUT', body: { value }, staff: true }));
      setMsg('Saved. Changes apply to new bookings and listings only.');
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  async function saveFees() {
    for (const f of FEES) {
      if (draft[f.key] === undefined) continue;
      const n = Number(draft[f.key]);
      await save(f.key, f.percent ? n / 100 : n);
    }
    setDraft({});
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 30 }}>Fees, categories &amp; cities</h1>
        {isAdmin && <button type="button" className="btn bp" disabled={Object.keys(draft).length === 0} onClick={() => void saveFees()}>Save changes</button>}
      </div>
      <div className="note"><span>Changes apply to new bookings and listings only. {isAdmin ? 'Every change is logged.' : 'Admin role required to change settings.'}</span></div>
      {msg && <div className="note g" role="status">{msg}</div>}
      {err && <div className="note r" role="alert">{err}</div>}

      <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }} aria-labelledby="fc">
        <h2 id="fc" style={{ fontSize: 20 }}>Fees &amp; commission</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {FEES.map((f) => (
            <div key={f.key}>
              <label className="lbl" htmlFor={f.key}>{f.label} ({f.unit})</label>
              <input id={f.key} className="in" inputMode="decimal" disabled={!isAdmin} value={shown(f)} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value.replace(/[^\d.]/g, '') }))} />
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflowX: 'auto' }} aria-labelledby="vc">
        <h2 id="vc" style={{ fontSize: 20 }}>Vehicle categories</h2>
        <table className="tbl">
          <thead><tr><th>Category</th><th>Rent</th><th>Sale</th><th>Licence checked</th></tr></thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={c.key}>
                <td>{c.label}</td>
                {(['rent', 'buy'] as const).map((k) => (
                  <td key={k}>
                    <button type="button" className={`tog ${c[k] ? 'on' : ''}`} aria-pressed={c[k]} aria-label={`${c.label} ${k === 'rent' ? 'rent' : 'sale'}`} disabled={!isAdmin}
                      onClick={() => void save('vehicle_categories', categories.map((x, j) => (j === i ? { ...x, [k]: !x[k] } : x)))} />
                  </td>
                ))}
                <td className="sm">{Object.entries(licence).filter(([t]) => t === c.key || (c.key === 'ev' && t.startsWith('ev'))).map(([, v]) => v).filter((v, j, a) => a.indexOf(v) === j).join(' / ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflowX: 'auto' }} aria-labelledby="ct">
        <h2 id="ct" style={{ fontSize: 20 }}>Cities &amp; launch areas</h2>
        <table className="tbl">
          <thead><tr><th>City</th><th>State rules</th><th>Launch areas</th><th>Status</th></tr></thead>
          <tbody>
            {cities.map((c) => (
              <tr key={c.key}>
                <td><strong>{c.name}</strong><div className="xs mut">Geofence {c.radiusKm ?? 35} km</div></td>
                <td className="sm">{c.state}{c.rules ? ` · ${c.rules}` : ''}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {data.areas.filter((a) => a.city === c.key).map((a) => (
                      <button key={a.id} type="button" className={`chip ${a.active ? 'ok' : ''}`} disabled={!isAdmin} title={a.active ? 'Click to hide' : 'Click to show'}
                        onClick={() => void api<Settings>(`/admin/areas/${a.id}`, { method: 'PATCH', body: { active: !a.active }, staff: true }).then(setData)} style={{ border: 0, cursor: isAdmin ? 'pointer' : 'default', textDecoration: a.active ? undefined : 'line-through' }}>
                        {a.name}
                      </button>
                    ))}
                  </div>
                  {isAdmin && <AddArea city={c.key} onAdded={setData} />}
                </td>
                <td><span className="chip ok">Live</span></td>
              </tr>
            ))}
            {planned.map((c) => (
              <tr key={c.key}>
                <td><strong>{c.name}</strong></td>
                <td className="sm">{c.state} · {c.rules}</td>
                <td>—</td>
                <td><span className="chip">Planned</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="xs mut">Adding a new city needs its state&apos;s rental rules confirmed first; edit the &quot;cities&quot; setting once that&apos;s done.</p>
      </section>
    </>
  );
}

function AddArea({ city, onAdded }: { city: string; onAdded: (s: Settings) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [err, setErr] = useState<string | null>(null);
  if (!open) return <button type="button" className="btn bt" style={{ minHeight: 28, padding: 0, marginTop: 6 }} onClick={() => setOpen(true)}>+ Add area</button>;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        void api<Settings>('/admin/areas', { body: { city, name, lat: Number(lat), lng: Number(lng) }, staff: true })
          .then((s) => { onAdded(s); setOpen(false); setName(''); setLat(''); setLng(''); })
          .catch((x: unknown) => setErr(errorMessage(x)));
      }}
      style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}
    >
      <input className="in" style={{ width: 140 }} aria-label="Area name" placeholder="Area" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="in" style={{ width: 100 }} aria-label="Latitude" placeholder="Lat" value={lat} onChange={(e) => setLat(e.target.value)} required />
      <input className="in" style={{ width: 100 }} aria-label="Longitude" placeholder="Lng" value={lng} onChange={(e) => setLng(e.target.value)} required />
      <button type="submit" className="btn bs" style={{ minHeight: 36 }}>Add</button>
      {err && <span className="xs" style={{ color: '#9B1C13', width: '100%' }}>{err}</span>}
    </form>
  );
}
