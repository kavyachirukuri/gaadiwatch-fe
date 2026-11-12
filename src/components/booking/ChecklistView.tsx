'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api, errorMessage, useRequireAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { inr } from '@/lib/format';
import { fmtDateTime } from '@/lib/bookings-api';
import { FilePick, Thumb } from '@/components/ui/FilePick';

type Photo = { label: string; url: string; at: string };
type Side = {
  photos: Photo[];
  odometerKm: number | null;
  fuelLevel: string | null;
  accessories: string[];
  notes: string | null;
  newDamage: boolean | null;
  damageAmount: number | null;
  operatorConfirmedAt: string | null;
  renterConfirmedAt: string | null;
};
type Data = {
  role: 'renter' | 'operator';
  booking: {
    id: string;
    code: string;
    status: string;
    startAt: string;
    endAt: string;
    title: string;
    type: string;
    registration: string;
    renterName: string;
    operatorName: string;
    deposit: number;
    damageProtection: boolean;
    helmetsIncluded: number | null;
    settlement: { depositRefund: number | null; settledAt: string | null; damageKept: number };
  };
  requiredPhotos: number;
  photoLabels: string[];
  fuelLevels: string[];
  pickup: Side | null;
  return: Side | null;
  preview: {
    kmDriven: number | null;
    freeKm: number | null;
    extraKm: number;
    extraKmRate: number;
    extraKmFee: number;
    odometer: { pickup: number | null; return: number | null };
    fuel: { pickup: string | null; return: string | null; fee: number; electric: boolean };
    returnedAt: string | null;
    lateMinutes: number;
    lateFee: number;
    deposit: number;
    damageHeld: number;
    refundNow: number;
  };
};

export function ChecklistView() {
  const { user } = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const { data, error, setData } = useApi<Data>(user ? `/bookings/${id}/checklist` : null);
  const [phase, setPhase] = useState<'pickup' | 'return' | null>(null);

  if (error && !data) return <main className="wrap"><div className="note r">{error}</div></main>;
  if (!data) return <main className="wrap mut">Loading…</main>;

  const b = data.booking;
  const started = !['accepted', 'paid'].includes(b.status);
  const current = phase ?? (started ? 'return' : 'pickup');

  return (
    <main className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Link href={data.role === 'operator' ? '/operator/requests' : `/trips?id=${b.id}`} className="sm">← Back</Link>
          <h1 style={{ fontSize: 32 }}>Hand-over checklist</h1>
          <p className="mut">Booking {b.code} · {b.title} · {b.registration} · both renter and operator confirm</p>
        </div>
        <div className="seg" role="tablist" aria-label="Checklist">
          <button role="tab" aria-selected={current === 'pickup'} className={current === 'pickup' ? 'on' : ''} onClick={() => setPhase('pickup')}>Pick-up</button>
          <button role="tab" aria-selected={current === 'return'} className={current === 'return' ? 'on' : ''} onClick={() => setPhase('return')} disabled={!started}>Return</button>
        </div>
      </div>

      {b.status === 'completed' && (
        <div className="note g"><span>Trip complete. {inr(b.settlement.depositRefund ?? 0)} of the deposit was refunded to the renter.</span></div>
      )}
      {b.status === 'disputed' && (
        <div className="note w"><span>New damage was reported. Part of the deposit is on hold while support reviews the photos. <Link href="/help">See dispute</Link></span></div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <ChecklistForm key={`${current}-${(current === 'pickup' ? data.pickup : data.return)?.operatorConfirmedAt ?? ''}`} data={data} phase={current} onSaved={setData} />
        <aside style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ReturnPreview data={data} />
        </aside>
      </div>
    </main>
  );
}

function ChecklistForm({ data, phase, onSaved }: { data: Data; phase: 'pickup' | 'return'; onSaved: (d: Data) => void }) {
  const b = data.booking;
  const side = phase === 'pickup' ? data.pickup : data.return;
  const isOperator = data.role === 'operator';
  const locked = phase === 'pickup' ? !['accepted', 'paid'].includes(b.status) : !['active', 'returned'].includes(b.status);
  const accessoriesList = [b.helmetsIncluded ? `${b.helmetsIncluded} helmet${b.helmetsIncluded > 1 ? 's' : ''}` : null, 'Key + spare', 'RC copy'].filter(Boolean) as string[];

  const [photos, setPhotos] = useState<Photo[]>(side?.photos ?? []);
  const [odo, setOdo] = useState(side?.odometerKm?.toString() ?? '');
  const [fuel, setFuel] = useState(side?.fuelLevel ?? '');
  const [acc, setAcc] = useState<string[]>(side?.accessories ?? []);
  const [notes, setNotes] = useState(side?.notes ?? '');
  const [damage, setDamage] = useState<boolean | null>(side?.newDamage ?? null);
  const [damageAmount, setDamageAmount] = useState(side?.damageAmount?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const touch = () => setDirty(true);

  const iConfirmed = Boolean(isOperator ? side?.operatorConfirmedAt : side?.renterConfirmedAt);
  const electric = data.preview.fuel.electric;

  async function run(fn: () => Promise<Data>) {
    setBusy(true);
    setError(null);
    try {
      onSaved(await fn());
      setDirty(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    api<Data>(`/bookings/${b.id}/checklist/${phase}`, {
      method: 'PUT',
      body: {
        photos,
        odometerKm: odo ? Number(odo.replace(/\D/g, '')) : undefined,
        fuelLevel: electric ? undefined : fuel || undefined,
        accessories: acc,
        notes: notes || undefined,
        ...(isOperator && phase === 'return' ? { newDamage: damage ?? undefined, damageAmount: damage && damageAmount ? Number(damageAmount) : undefined } : {}),
      },
    });

  const confirm = async () => {
    if (dirty || !side) await save();
    return api<Data>(`/bookings/${b.id}/checklist/${phase}/confirm`, { method: 'POST' });
  };

  return (
    <section className="card" style={{ flex: '999 1 560px', minWidth: 0, padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }} aria-labelledby="ph">
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2 id="ph" style={{ fontSize: 20 }}>1. Vehicle photos</h2>
        <span className={`chip ${photos.length >= data.requiredPhotos ? 'ok' : 'wa'}`}>{photos.length} of {data.requiredPhotos} required</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {data.photoLabels.map((label) => {
          const p = photos.find((x) => x.label === label);
          return p ? (
            <Thumb key={label} url={p.url} label={`${label} · ${new Date(p.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`} onRemove={locked ? undefined : () => { setPhotos((xs) => xs.filter((x) => x.label !== label)); touch(); }} />
          ) : (
            <FilePick
              key={label}
              label={<span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>📷<span>{label}</span></span>}
              className="card"
              style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', font: '600 13px var(--font-body)', color: 'var(--green)', width: '100%' }}
              onUploaded={(url) => { setPhotos((xs) => [...xs, { label, url, at: new Date().toISOString() }]); touch(); }}
            />
          );
        })}
      </div>

      <hr className="hr" />
      <h2 style={{ fontSize: 20 }}>2. Readings</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div>
          <label className="lbl" htmlFor="od">Odometer (km)</label>
          <input id="od" className="in" inputMode="numeric" value={odo} disabled={locked} onChange={(e) => { setOdo(e.target.value); touch(); }} />
        </div>
        {!electric && (
          <div>
            <span className="lbl">Fuel level</span>
            <div className="seg" style={{ width: '100%', boxSizing: 'border-box' }}>
              {data.fuelLevels.map((f) => (
                <button key={f} type="button" className={fuel === f ? 'on' : ''} aria-pressed={fuel === f} disabled={locked} onClick={() => { setFuel(f); touch(); }}>{f === '1/4' ? '¼' : f === '1/2' ? '½' : f === '3/4' ? '¾' : f}</button>
              ))}
            </div>
          </div>
        )}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="lbl">Accessories</legend>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} className="sm">
            {accessoriesList.map((a) => (
              <label key={a} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" disabled={locked} checked={acc.includes(a)} onChange={() => { setAcc((xs) => (xs.includes(a) ? xs.filter((x) => x !== a) : [...xs, a])); touch(); }} style={{ accentColor: 'var(--green)' }} />
                {a}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div>
        <label className="lbl" htmlFor="nt">{phase === 'pickup' ? 'Existing scratches or issues' : 'Notes at return'}</label>
        <textarea id="nt" className="in" rows={3} value={notes} disabled={locked} onChange={(e) => { setNotes(e.target.value); touch(); }} />
      </div>

      {phase === 'return' && isOperator && !locked && (
        <>
          <hr className="hr" />
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <legend style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Any new damage?</legend>
            <label className="li" style={{ borderColor: damage === false ? 'var(--green)' : undefined, cursor: 'pointer' }}>
              <input type="radio" name="dmg" checked={damage === false} onChange={() => { setDamage(false); touch(); }} style={{ accentColor: 'var(--green)' }} />
              <span><strong>No damage</strong><span className="sm mut"> — refund deposit and pay owner</span></span>
            </label>
            <label className="li" style={{ borderColor: damage === true ? 'var(--green)' : undefined, cursor: 'pointer' }}>
              <input type="radio" name="dmg" checked={damage === true} onChange={() => { setDamage(true); touch(); }} style={{ accentColor: 'var(--green)' }} />
              <span><strong>Yes, raise a claim</strong><span className="sm mut"> — support reviews the pick-up photos; repair cost is kept from the deposit</span></span>
            </label>
            {damage && (
              <div style={{ maxWidth: 260 }}>
                <label className="lbl" htmlFor="da">Repair amount claimed (₹)</label>
                <input id="da" className="in" inputMode="numeric" value={damageAmount} onChange={(e) => { setDamageAmount(e.target.value.replace(/\D/g, '')); touch(); }} />
                {b.damageProtection && <p className="xs mut" style={{ marginTop: 4 }}>The renter bought damage protection, so the claim is capped.</p>}
              </div>
            )}
          </fieldset>
        </>
      )}

      <hr className="hr" />
      <h2 style={{ fontSize: 20 }}>3. Both confirm</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <div className="li"><span className={`chip ${side?.operatorConfirmedAt ? 'ok' : ''}`}>{side?.operatorConfirmedAt ? '✓' : '…'}</span><div style={{ flex: 1 }}><strong>Operator · {b.operatorName}</strong><div className="xs mut">{side?.operatorConfirmedAt ? `Confirmed ${fmtDateTime(side.operatorConfirmedAt)}` : 'Not confirmed yet'}</div></div></div>
        <div className="li"><span className={`chip ${side?.renterConfirmedAt ? 'ok' : ''}`}>{side?.renterConfirmedAt ? '✓' : '…'}</span><div style={{ flex: 1 }}><strong>Renter · {b.renterName}</strong><div className="xs mut">{side?.renterConfirmedAt ? `Confirmed ${fmtDateTime(side.renterConfirmedAt)}` : 'Not confirmed yet'}</div></div></div>
      </div>
      {error && <div className="note r" role="alert">{error}</div>}
      {!locked && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn bs" disabled={busy || !dirty} onClick={() => void run(save)}>Save</button>
          <button type="button" className="btn bp" disabled={busy || (iConfirmed && !dirty)} onClick={() => void run(confirm)}>
            {busy ? 'Saving…' : iConfirmed && !dirty ? 'You confirmed — waiting for the other side' : phase === 'pickup' ? 'Confirm & start trip' : 'Confirm return'}
          </button>
        </div>
      )}
      <p className="xs mut">{phase === 'pickup' ? 'Tracking starts when the trip starts. These photos are used if there is a damage claim later.' : 'Any change clears both confirmations, so each side sees the final version.'}</p>
    </section>
  );
}

function ReturnPreview({ data }: { data: Data }) {
  const p = data.preview;
  const pick = data.pickup?.photos.find((x) => x.label === 'Left');
  const ret = data.return?.photos.find((x) => x.label === 'Left');
  const deductions = p.extraKmFee + p.fuel.fee + p.lateFee;
  return (
    <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }} aria-labelledby="rt">
      <span className="k">Return preview</span>
      <h2 id="rt" style={{ fontSize: 20 }}>Pick-up vs return</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {pick ? <Thumb url={pick.url} label="Pick-up · left" height={80} /> : <div className="ph" style={{ height: 80 }}>Pick-up · left</div>}
        {ret ? <Thumb url={ret.url} label="Return · left" height={80} /> : <div className="ph" style={{ height: 80 }}>Return · left</div>}
      </div>
      <div className="sm" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Row k="Odometer" v={`${p.odometer.pickup?.toLocaleString('en-IN') ?? '—'} → ${p.odometer.return?.toLocaleString('en-IN') ?? '—'} km`} />
        <Row k="Driven / free" v={`${p.kmDriven ?? '—'} / ${p.freeKm ?? 'unlimited'} km`} />
        {p.extraKm > 0 && <Row k={`Extra km · ${p.extraKm} × ${inr(p.extraKmRate)}`} v={inr(p.extraKmFee)} strong />}
        {!p.fuel.electric && <Row k={`Fuel ${p.fuel.pickup ?? '—'} → ${p.fuel.return ?? '—'}`} v={inr(p.fuel.fee)} />}
        <Row k={p.returnedAt ? `Returned ${new Date(p.returnedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : 'Return due'} v={p.lateMinutes > 0 ? `${p.lateMinutes} min late · ${inr(p.lateFee)}` : 'On time'} />
      </div>
      <div className="note g sm">
        <span>Deposit {inr(p.deposit)}{deductions ? ` − ${inr(deductions)}` : ''}{p.damageHeld ? ` − ${inr(p.damageHeld)} on hold` : ''} = <strong>{inr(p.refundNow)}</strong> refunded to the renter within 48 hours.</span>
      </div>
      <Link className="btn bt" href="/help">Raise a dispute</Link>
    </section>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span>{k}</span>
      {strong ? <strong>{v}</strong> : <span>{v}</span>}
    </div>
  );
}
