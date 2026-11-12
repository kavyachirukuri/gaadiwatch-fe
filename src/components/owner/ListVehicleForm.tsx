'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, errorMessage, useRequireAuth, type Me } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { useMeta } from '@/lib/use-meta';
import { inr } from '@/lib/format';
import { FilePick, Thumb } from '@/components/ui/FilePick';

type Purpose = 'rent' | 'sell' | 'both';
type Doc = { type: 'rc' | 'insurance' | 'puc' | 'permit'; fileUrl: string; expiresAt?: string | null };
type Form = {
  purpose: Purpose;
  registrationType: 'commercial' | 'private';
  type: string;
  make: string;
  model: string;
  year: string;
  fuel: string;
  odometerKm: string;
  registrationNo: string;
  ownerCount: string;
  area: string;
  description: string;
  serviceHistory: boolean;
  photos: string[];
  documents: Doc[];
  rent: {
    pricePerHour: string;
    pricePerDay: string;
    pricePerWeek: string;
    pricePerMonth: string;
    depositAmount: string;
    freeKmPerDay: string;
    extraKmCharge: string;
    lateFeePerHour: string;
    lateGraceMinutes: string;
    fuelChargePerLitre: string;
    helmetsIncluded: string;
    cancellationPolicy: string;
    deliveryFee: string; // '' = no delivery
    instantBook: boolean;
  };
  sale: { salePrice: string; openToOffers: boolean; featured: boolean };
  tracking: { source: string; imei: string; allowedArea: string; speedLimitKmph: string; fittingSlot: string };
};
type Saved = {
  id: string;
  status: string;
  reviewNote: string | null;
  form: Record<string, unknown> & { rent: Record<string, unknown>; sale: Record<string, unknown>; tracking: Record<string, unknown>; documents: Doc[]; photos: string[] };
  blocks: { id: string; start: string; end: string; reason: string | null }[];
};
type Hint = { area: string | null; perDay: { low: number; high: number } | null; deposit: { low: number; high: number } | null; salePrice: { low: number; high: number } | null };

const TYPES = [
  { key: 'scooter', label: 'Scooter' },
  { key: 'bike', label: 'Bike' },
  { key: 'ev_two_wheeler', label: 'EV 2-wheeler' },
  { key: 'ev_car', label: 'EV 4-wheeler' },
  { key: 'car', label: 'Car' },
  { key: 'three_wheeler', label: '3-wheeler', saleOnly: true },
  { key: 'truck', label: 'Truck', saleOnly: true },
  { key: 'lorry', label: 'Lorry', saleOnly: true },
];
const FUELS = ['petrol', 'diesel', 'electric', 'cng', 'hybrid'];
const DOCS: { type: Doc['type']; label: string; hint: string; rentOnly?: boolean; required?: boolean }[] = [
  { type: 'rc', label: 'RC', hint: 'Required', required: true },
  { type: 'insurance', label: 'Insurance', hint: 'Required for rent · commercial / hire cover', rentOnly: true },
  { type: 'puc', label: 'PUC certificate', hint: 'Optional' },
];
const SOURCES = [
  { key: 'gps_device', title: 'GaadiWatch GPS device', note: 'Most reliable. Fitted at your location.', recommended: true },
  { key: 'tracker', title: 'Existing tracker or EV app', note: "Connect your GPS tracker (IMEI) or EV maker's app." },
  { key: 'phone', title: "Renter's phone", note: 'Free. Works only while the app is open during the trip.' },
  { key: 'none', title: 'No tracking', note: 'Renters see that the vehicle is not tracked.' },
];

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const n = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(/[^\d]/g, '')));

function emptyForm(): Form {
  return {
    purpose: 'both',
    registrationType: 'commercial',
    type: 'scooter',
    make: '',
    model: '',
    year: String(new Date().getFullYear()),
    fuel: 'petrol',
    odometerKm: '',
    registrationNo: '',
    ownerCount: '1',
    area: '',
    description: '',
    serviceHistory: false,
    photos: [],
    documents: [],
    rent: { pricePerHour: '', pricePerDay: '', pricePerWeek: '', pricePerMonth: '', depositAmount: '', freeKmPerDay: '', extraKmCharge: '', lateFeePerHour: '', lateGraceMinutes: '30', fuelChargePerLitre: '', helmetsIncluded: '', cancellationPolicy: 'moderate', deliveryFee: '', instantBook: false },
    sale: { salePrice: '', openToOffers: true, featured: false },
    tracking: { source: 'gps_device', imei: '', allowedArea: '', speedLimitKmph: '80', fittingSlot: '' },
  };
}

function fromSaved(x: Saved['form']): Form {
  const f = emptyForm();
  const r = x.rent;
  const t = x.tracking;
  return {
    ...f,
    purpose: x.purpose as Purpose,
    registrationType: x.registrationType as Form['registrationType'],
    type: s(x.type),
    make: s(x.make),
    model: s(x.model),
    year: s(x.year),
    fuel: s(x.fuel),
    odometerKm: s(x.odometerKm),
    registrationNo: s(x.registrationNo),
    ownerCount: s(x.ownerCount),
    area: s(x.area),
    description: s(x.description),
    serviceHistory: Boolean(x.serviceHistory),
    photos: x.photos,
    documents: x.documents.map((d) => ({ type: d.type, fileUrl: d.fileUrl, expiresAt: d.expiresAt ? String(d.expiresAt).slice(0, 10) : null })),
    rent: {
      pricePerHour: s(r.pricePerHour),
      pricePerDay: s(r.pricePerDay),
      pricePerWeek: s(r.pricePerWeek),
      pricePerMonth: s(r.pricePerMonth),
      depositAmount: s(r.depositAmount),
      freeKmPerDay: s(r.freeKmPerDay),
      extraKmCharge: s(r.extraKmCharge),
      lateFeePerHour: s(r.lateFeePerHour),
      lateGraceMinutes: s(r.lateGraceMinutes),
      fuelChargePerLitre: s(r.fuelChargePerLitre),
      helmetsIncluded: s(r.helmetsIncluded),
      cancellationPolicy: s(r.cancellationPolicy) || 'moderate',
      deliveryFee: s(r.deliveryFee),
      instantBook: Boolean(r.instantBook),
    },
    sale: { salePrice: s(x.sale.salePrice), openToOffers: Boolean(x.sale.openToOffers), featured: Boolean(x.sale.featured) },
    tracking: { source: s(t.source) || 'none', imei: s(t.imei), allowedArea: s(t.allowedArea), speedLimitKmph: s(t.speedLimitKmph), fittingSlot: s(t.fittingSlot) },
  };
}

function toBody(f: Form, submit: boolean) {
  const rents = f.purpose !== 'sell';
  return {
    purpose: f.purpose,
    registrationType: f.registrationType,
    type: f.type,
    make: f.make,
    model: f.model,
    year: Number(f.year),
    fuel: f.fuel,
    odometerKm: n(f.odometerKm),
    registrationNo: f.registrationNo,
    ownerCount: n(f.ownerCount),
    area: f.area,
    description: f.description || undefined,
    serviceHistory: f.serviceHistory,
    photos: f.photos,
    documents: f.documents.map((d) => ({ type: d.type, fileUrl: d.fileUrl, expiresAt: d.expiresAt || undefined })),
    rent: rents
      ? {
          pricePerHour: n(f.rent.pricePerHour),
          pricePerDay: n(f.rent.pricePerDay),
          pricePerWeek: n(f.rent.pricePerWeek),
          pricePerMonth: n(f.rent.pricePerMonth),
          depositAmount: n(f.rent.depositAmount),
          freeKmPerDay: n(f.rent.freeKmPerDay),
          extraKmCharge: n(f.rent.extraKmCharge),
          lateFeePerHour: n(f.rent.lateFeePerHour),
          lateGraceMinutes: n(f.rent.lateGraceMinutes),
          fuelChargePerLitre: n(f.rent.fuelChargePerLitre),
          helmetsIncluded: n(f.rent.helmetsIncluded),
          cancellationPolicy: f.rent.cancellationPolicy,
          deliveryFee: f.rent.deliveryFee === '' ? null : n(f.rent.deliveryFee),
          instantBook: f.rent.instantBook,
        }
      : {},
    sale: f.purpose !== 'rent' ? { salePrice: n(f.sale.salePrice), openToOffers: f.sale.openToOffers, featured: f.sale.featured } : {},
    tracking: rents
      ? {
          source: f.tracking.source,
          imei: f.tracking.imei || undefined,
          allowedArea: f.tracking.allowedArea || undefined,
          speedLimitKmph: n(f.tracking.speedLimitKmph),
          fittingSlot: f.tracking.fittingSlot || undefined,
        }
      : { source: 'none' },
    submit,
  };
}

export function ListVehicleForm() {
  const { user } = useRequireAuth();
  const editId = useSearchParams().get('id');
  const saved = useApi<Saved>(user && editId ? `/me/listings/${editId}` : null);
  if (!user || (editId && !saved.data)) return <main className="wrap mut">{saved.error ?? 'Loading…'}</main>;
  return <Editor key={saved.data?.id ?? 'new'} user={user} saved={saved.data} />;
}

function Editor({ user, saved }: { user: Me; saved: Saved | null }) {
  const router = useRouter();
  const { meta } = useMeta();
  const [f, setF] = useState<Form>(() => (saved ? fromSaved(saved.form) : emptyForm()));
  const [blocks, setBlocks] = useState(saved?.blocks ?? []);
  const [confirmOk, setConfirmOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hint = useApi<Hint>(f.area && f.type ? `/me/listings/price-hint?type=${f.type}&area=${encodeURIComponent(meta?.areas.find((a) => f.area.toLowerCase().includes(a.name.toLowerCase()))?.name ?? '')}` : null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const setRent = (k: keyof Form['rent'], v: string | boolean) => setF((x) => ({ ...x, rent: { ...x.rent, [k]: v } }));
  const setSale = (k: keyof Form['sale'], v: string | boolean) => setF((x) => ({ ...x, sale: { ...x.sale, [k]: v } }));
  const setTrack = (k: keyof Form['tracking'], v: string) => setF((x) => ({ ...x, tracking: { ...x.tracking, [k]: v } }));

  const isOperator = user.operator?.status === 'verified';
  const saleOnlyType = TYPES.find((t) => t.key === f.type)?.saleOnly;
  const canRent = isOperator && f.registrationType === 'commercial' && !saleOnlyType;
  const rents = f.purpose !== 'sell';
  const sells = f.purpose !== 'rent';
  const minPhotos = meta?.minListingPhotos ?? 5;
  const fees = meta?.fees;

  async function save(submit: boolean) {
    setBusy(true);
    setError(null);
    try {
      const body = toBody(f, submit);
      const r = saved ? await api<Saved>(`/me/listings/${saved.id}`, { method: 'PUT', body }) : await api<Saved>('/me/listings', { body });
      if (submit) router.push('/operator?listed=1');
      else if (!saved) router.replace(`/list-vehicle?id=${r.id}`);
      else setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function addBlock(start: string, end: string, reason: string) {
    if (!saved) return;
    try {
      const r = await api<Saved>(`/me/listings/${saved.id}/blocks`, { body: { start: new Date(start).toISOString(), end: new Date(end).toISOString(), reason: reason || undefined } });
      setBlocks(r.blocks);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function removeBlock(blockId: string) {
    if (!saved) return;
    const r = await api<Saved>(`/me/listings/${saved.id}/blocks/${blockId}`, { method: 'DELETE' });
    setBlocks(r.blocks);
  }

  const steps = ['Rent, sell or both', 'Vehicle details', 'Photos & documents', 'Prices', ...(rents ? ['Availability', 'Tracking'] : []), 'Review & submit'];

  return (
    <div className="wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
      <nav aria-label="Steps" className="sm" style={{ flex: '1 1 220px', maxWidth: 260, display: 'flex', flexDirection: 'column', gap: 6, position: 'sticky', top: 16 }}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>{saved ? 'Edit listing' : 'List a vehicle'}</h1>
        {steps.map((label, i) => (
          <a key={label} href={`#s${i + 1}`} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, textDecoration: 'none', color: 'var(--ink)' }}>
            <span className="step">{i + 1}</span>{label}
          </a>
        ))}
        <button type="button" className="btn bs" disabled={busy} onClick={() => void save(false)} style={{ marginTop: 8 }}>Save draft</button>
      </nav>

      <main className="main" style={{ gap: 24 }}>
        {saved?.reviewNote && <div className="note w"><span><strong>From our review team:</strong> {saved.reviewNote}</span></div>}

        <section id="s1" className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }} aria-labelledby="h1">
          <span className="k">Step 1</span>
          <h2 id="h1" style={{ fontSize: 22 }}>What do you want to do with this vehicle?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {([
              ['rent', 'Rent it out', 'Commercial registration + rental licence needed'],
              ['sell', 'Sell it', 'Any vehicle, private or commercial'],
              ['both', 'Both', 'One listing, renters and buyers'],
            ] as const).map(([k, t, d]) => {
              const disabled = k !== 'sell' && !canRent;
              return (
                <label key={k} className="li" style={{ flexDirection: 'column', alignItems: 'flex-start', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, borderColor: f.purpose === k ? 'var(--green)' : undefined, borderWidth: f.purpose === k ? 2 : undefined }}>
                  <input type="radio" name="purpose" checked={f.purpose === k} disabled={disabled} onChange={() => set('purpose', k)} style={{ accentColor: 'var(--green)' }} />
                  <strong>{t}</strong>
                  <span className="sm mut">{d}</span>
                </label>
              );
            })}
          </div>
          <div>
            <span className="lbl">Registration type</span>
            <div className="seg" style={{ flexWrap: 'wrap' }}>
              <button type="button" className={f.registrationType === 'commercial' ? 'on' : ''} onClick={() => set('registrationType', 'commercial')}>Commercial (yellow / black plate)</button>
              <button type="button" className={f.registrationType === 'private' ? 'on' : ''} onClick={() => setF((x) => ({ ...x, registrationType: 'private', purpose: 'sell' }))}>Private (white plate)</button>
            </div>
          </div>
          <div className="note w">
            <span>
              Private (white-plate) vehicles can only be listed for sale. Renting needs commercial registration and your rental licence or permit.
              {!isOperator && <> <Link href="/verify?next=/list-vehicle">Register as a rental operator</Link> to rent vehicles out.</>}
            </span>
          </div>
        </section>

        <section id="s2" className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }} aria-labelledby="h2">
          <span className="k">Step 2</span>
          <h2 id="h2" style={{ fontSize: 22 }}>Vehicle details</h2>
          <div>
            <span className="lbl">Vehicle type</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TYPES.map((t) => (
                <button key={t.key} type="button" className={`btn ${f.type === t.key ? 'bp' : 'bs'}`} style={{ minHeight: 40 }} aria-pressed={f.type === t.key}
                  onClick={() => setF((x) => ({ ...x, type: t.key, purpose: t.saleOnly ? 'sell' : x.purpose, fuel: t.key.startsWith('ev') ? 'electric' : x.fuel }))}>
                  {t.label}{t.saleOnly ? ' · sale only' : ''}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <Field id="mk" label="Make" value={f.make} onChange={(v) => set('make', v)} placeholder="Honda" />
            <Field id="md" label="Model" value={f.model} onChange={(v) => set('model', v)} placeholder="Activa 6G" />
            <Field id="yr" label="Year" value={f.year} onChange={(v) => set('year', v.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" />
            <div>
              <label className="lbl" htmlFor="fu">Fuel</label>
              <select id="fu" className="in" value={f.fuel} onChange={(e) => set('fuel', e.target.value)}>
                {FUELS.map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}
              </select>
            </div>
            <Field id="od" label="Odometer (km)" value={f.odometerKm} onChange={(v) => set('odometerKm', v.replace(/\D/g, ''))} inputMode="numeric" />
            <Field id="rg" label="Registration number" value={f.registrationNo} onChange={(v) => set('registrationNo', v.toUpperCase())} placeholder="KA 01 AB 1234" />
            <Field id="oc" label="Number of owners" value={f.ownerCount} onChange={(v) => set('ownerCount', v.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" />
          </div>
          <div>
            <label className="lbl" htmlFor="pa">Pick-up area</label>
            <input id="pa" className="in" list="areas" value={f.area} onChange={(e) => set('area', e.target.value)} placeholder="Choose a launch area" />
            <datalist id="areas">
              {(meta?.areas ?? []).map((a) => <option key={`${a.city}-${a.name}`} value={a.name}>{meta?.cities.find((c) => c.key === a.city)?.name}</option>)}
            </datalist>
            <p className="xs mut" style={{ marginTop: 4 }}>Only the area is shown publicly; the exact address is shared after a booking is confirmed.</p>
          </div>
          <div>
            <label className="lbl" htmlFor="ds">Description{sells ? ' & service history' : ''}</label>
            <textarea id="ds" className="in" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          {sells && (
            <label className="sm" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={f.serviceHistory} onChange={(e) => set('serviceHistory', e.target.checked)} style={{ accentColor: 'var(--green)' }} />
              Service records available
            </label>
          )}
        </section>

        <section id="s3" className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }} aria-labelledby="h3">
          <span className="k">Step 3</span>
          <h2 id="h3" style={{ fontSize: 22 }}>Photos &amp; documents</h2>
          <div>
            <span className="lbl">Photos · at least {minPhotos} <span className={`chip ${f.photos.length >= minPhotos ? 'ok' : 'wa'}`} style={{ marginLeft: 6 }}>{f.photos.length} added</span></span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
              {f.photos.map((u, i) => <Thumb key={u} url={u} height={90} label={i === 0 ? 'Cover' : undefined} onRemove={() => set('photos', f.photos.filter((x) => x !== u))} />)}
              <FilePick label="+ Add" className="card" style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', color: 'var(--green)', font: '600 13px var(--font-body)', width: '100%' }} onUploaded={(u) => setF((x) => ({ ...x, photos: [...x.photos, u] }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {DOCS.filter((d) => !d.rentOnly || rents).map((d) => {
              const doc = f.documents.find((x) => x.type === d.type);
              return (
                <div key={d.type} className="li" style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 140px' }}>
                    <strong>{d.label}</strong>
                    <div className="xs mut">{d.hint}</div>
                    {doc && d.type === 'insurance' && (
                      <label className="xs" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                        Valid to <input type="date" className="in" style={{ minHeight: 30, padding: '2px 6px', width: 'auto' }} value={doc.expiresAt ?? ''} onChange={(e) => set('documents', f.documents.map((x) => (x.type === 'insurance' ? { ...x, expiresAt: e.target.value } : x)))} />
                      </label>
                    )}
                  </div>
                  {doc ? (
                    <a className="chip ok" href={doc.fileUrl} target="_blank" rel="noreferrer">Uploaded</a>
                  ) : null}
                  <FilePick label={doc ? 'Replace' : 'Upload'} accept="image/*,application/pdf" className="btn bs" style={{ minHeight: 36 }} onUploaded={(u) => set('documents', [...f.documents.filter((x) => x.type !== d.type), { type: d.type, fileUrl: u }])} />
                </div>
              );
            })}
            {rents && (
              <div className="li">
                <div style={{ flex: 1 }}><strong>Rental licence / permit</strong><div className="xs mut">From your operator profile</div></div>
                <span className={`chip ${isOperator ? 'ok' : 'er'}`}>{isOperator ? 'Linked' : 'Not verified'}</span>
              </div>
            )}
          </div>
        </section>

        <section id="s4" className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }} aria-labelledby="h4">
          <span className="k">Step 4</span>
          <h2 id="h4" style={{ fontSize: 22 }}>Prices</h2>
          {hint.data && (hint.data.perDay || hint.data.salePrice) && (
            <div className="note g sm">
              <span>
                Suggested from similar vehicles{hint.data.area ? ` near ${hint.data.area}` : ''}:{' '}
                {rents && hint.data.perDay && <strong>{inr(hint.data.perDay.low)}–{inr(hint.data.perDay.high)} / day</strong>}
                {rents && hint.data.deposit && <>, deposit {inr(hint.data.deposit.low)}–{inr(hint.data.deposit.high)}</>}
                {sells && hint.data.salePrice && <> · sale {inr(hint.data.salePrice.low)}–{inr(hint.data.salePrice.high)}</>}
              </span>
            </div>
          )}
          {rents && (
            <>
              <h3 style={{ fontSize: 17 }}>Rental</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                <Field id="p1" label="Per hour (₹)" value={f.rent.pricePerHour} onChange={(v) => setRent('pricePerHour', v)} inputMode="numeric" />
                <Field id="p2" label="Per day (₹)" value={f.rent.pricePerDay} onChange={(v) => setRent('pricePerDay', v)} inputMode="numeric" />
                <Field id="p3" label="Per week (₹)" value={f.rent.pricePerWeek} onChange={(v) => setRent('pricePerWeek', v)} inputMode="numeric" />
                <Field id="p4" label="Per month (₹)" value={f.rent.pricePerMonth} onChange={(v) => setRent('pricePerMonth', v)} inputMode="numeric" />
                <Field id="p5" label="Deposit (₹)" value={f.rent.depositAmount} onChange={(v) => setRent('depositAmount', v)} inputMode="numeric" />
                <Field id="p6" label="Free km per day" value={f.rent.freeKmPerDay} onChange={(v) => setRent('freeKmPerDay', v)} inputMode="numeric" />
                <Field id="p7" label="Extra km charge (₹/km)" value={f.rent.extraKmCharge} onChange={(v) => setRent('extraKmCharge', v)} inputMode="numeric" />
                <Field id="p8" label="Late fee (₹/hour)" value={f.rent.lateFeePerHour} onChange={(v) => setRent('lateFeePerHour', v)} inputMode="numeric" />
                <Field id="p9" label="Grace period (min)" value={f.rent.lateGraceMinutes} onChange={(v) => setRent('lateGraceMinutes', v)} inputMode="numeric" />
                <Field id="p10" label="Fuel charge (₹/litre)" value={f.rent.fuelChargePerLitre} onChange={(v) => setRent('fuelChargePerLitre', v)} inputMode="numeric" />
                <Field id="p11" label="Helmets included" value={f.rent.helmetsIncluded} onChange={(v) => setRent('helmetsIncluded', v)} inputMode="numeric" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <div>
                  <label className="lbl" htmlFor="cp">Cancellation policy</label>
                  <select id="cp" className="in" value={f.rent.cancellationPolicy} onChange={(e) => setRent('cancellationPolicy', e.target.value)}>
                    {Object.entries(meta?.cancellationPolicies ?? {}).map(([k, v]) => <option key={k} value={k}>{v.label} — {v.summary}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lbl" htmlFor="dl">Delivery fee (₹) — leave empty for no delivery, 0 for free</label>
                  <input id="dl" className="in" inputMode="numeric" value={f.rent.deliveryFee} onChange={(e) => setRent('deliveryFee', e.target.value.replace(/\D/g, ''))} />
                </div>
                <div className="li" style={{ alignSelf: 'end' }}>
                  <div style={{ flex: 1 }}><strong>Instant book</strong><div className="xs mut">Skip the {meta?.requestReplyHours ?? 2}-hour approval</div></div>
                  <button type="button" className={`tog ${f.rent.instantBook ? 'on' : ''}`} aria-label="Instant book" aria-pressed={f.rent.instantBook} onClick={() => setRent('instantBook', !f.rent.instantBook)} />
                </div>
              </div>
            </>
          )}
          {sells && (
            <>
              {rents && <hr className="hr" />}
              <h3 style={{ fontSize: 17 }}>Sale</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <Field id="sp" label="Sale price (₹)" value={f.sale.salePrice} onChange={(v) => setSale('salePrice', v)} inputMode="numeric" />
                <div className="li"><div style={{ flex: 1 }}><strong>Open to offers</strong></div><button type="button" className={`tog ${f.sale.openToOffers ? 'on' : ''}`} aria-label="Open to offers" aria-pressed={f.sale.openToOffers} onClick={() => setSale('openToOffers', !f.sale.openToOffers)} /></div>
                <div className="li"><div style={{ flex: 1 }}><strong>Feature for 7 days</strong><div className="xs mut">Top of search{fees ? ` · ${inr(fees.saleBoost)}` : ''}</div></div><button type="button" className={`tog ${f.sale.featured ? 'on' : ''}`} aria-label="Feature listing" aria-pressed={f.sale.featured} onClick={() => setSale('featured', !f.sale.featured)} /></div>
              </div>
            </>
          )}
        </section>

        {rents && (
          <section id="s5" className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }} aria-labelledby="h5">
            <span className="k">Step 5</span>
            <h2 id="h5" style={{ fontSize: 22 }}>Availability</h2>
            <p className="sm mut">Block dates for servicing or personal use. Booked dates fill in automatically. Requests expire if you don&apos;t reply within {meta?.requestReplyHours ?? 2} hours.</p>
            {saved ? <Blocks blocks={blocks} onAdd={addBlock} onRemove={(id) => void removeBlock(id)} /> : <p className="sm">Save a draft first, then you can block dates here.</p>}
          </section>
        )}

        {rents && (
          <section id="s6" className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }} aria-labelledby="h6">
            <span className="k">Step 6</span>
            <h2 id="h6" style={{ fontSize: 22 }}>How should we track it?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {SOURCES.map((src) => (
                <label key={src.key} className="li" style={{ flexDirection: 'column', alignItems: 'flex-start', cursor: 'pointer', borderColor: f.tracking.source === src.key ? 'var(--green)' : undefined, borderWidth: f.tracking.source === src.key ? 2 : undefined }}>
                  <input type="radio" name="src" checked={f.tracking.source === src.key} onChange={() => setTrack('source', src.key)} style={{ accentColor: 'var(--green)' }} />
                  <strong>{src.title}</strong>
                  <span className="sm mut">{src.note}{src.key === 'gps_device' && fees ? ` ${inr(fees.gpsDevice)} one-time + ${inr(fees.gpsMonthly)} / month.` : ''}</span>
                  {src.recommended && <span className="chip ok">Recommended</span>}
                </label>
              ))}
            </div>
            {f.tracking.source !== 'none' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div>
                  <label className="lbl" htmlFor="gf">Allowed area (geofence)</label>
                  <select id="gf" className="in" value={f.tracking.allowedArea} onChange={(e) => setTrack('allowedArea', e.target.value)}>
                    <option value="">No geofence</option>
                    {(meta?.cities ?? []).map((c) => <option key={c.key} value={`${c.name} city limits`}>{c.name} city limits</option>)}
                  </select>
                </div>
                <Field id="sl" label="Over-speed alert above (km/h)" value={f.tracking.speedLimitKmph} onChange={(v) => setTrack('speedLimitKmph', v.replace(/\D/g, ''))} inputMode="numeric" />
                {f.tracking.source === 'tracker' && <Field id="im" label="Tracker IMEI" value={f.tracking.imei} onChange={(v) => setTrack('imei', v.replace(/\D/g, ''))} inputMode="numeric" />}
                {f.tracking.source === 'gps_device' && <Field id="fi" label="Preferred fitting slot" value={f.tracking.fittingSlot} onChange={(v) => setTrack('fittingSlot', v)} placeholder="Wed morning" />}
              </div>
            )}
          </section>
        )}

        <section id={`s${steps.length}`} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }} aria-labelledby="h7">
          <span className="k">Step {steps.length}</span>
          <h2 id="h7" style={{ fontSize: 22 }}>Review &amp; submit</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }} className="sm">
            <div><div className="mut">Listing</div><strong>{f.make || '—'} {f.model} {f.year} · {f.purpose === 'both' ? 'rent + sale' : f.purpose}</strong></div>
            {rents && <div><div className="mut">Rent</div><strong>{f.rent.pricePerDay ? `${inr(Number(f.rent.pricePerDay))}/day` : '—'} · {f.rent.depositAmount ? `${inr(Number(f.rent.depositAmount))} deposit` : 'no deposit set'}</strong></div>}
            {sells && <div><div className="mut">Sale</div><strong>{f.sale.salePrice ? inr(Number(f.sale.salePrice)) : '—'}{f.sale.openToOffers ? ' · open to offers' : ''}</strong></div>}
            {rents && <div><div className="mut">Tracking</div><strong>{SOURCES.find((x) => x.key === f.tracking.source)?.title}</strong></div>}
          </div>
          <div className="note"><span>Our team checks the registration number and type against the RC, plus insurance and your licence — usually within 24 hours. Rent is blocked if the RC shows a private registration.</span></div>
          <label className="sm" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={confirmOk} onChange={(e) => setConfirmOk(e.target.checked)} style={{ accentColor: 'var(--green)', marginTop: 2 }} />
            I confirm the details are correct and I&apos;m allowed to {rents && sells ? 'rent and sell' : rents ? 'rent' : 'sell'} this vehicle.
          </label>
          {error && <div className="note r" role="alert">{error}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn bp" disabled={busy || !confirmOk} onClick={() => void save(true)}>{busy ? 'Saving…' : saved?.status === 'live' ? 'Save changes' : 'Submit for review'}</button>
            <button type="button" className="btn bs" disabled={busy} onClick={() => void save(false)}>Save draft</button>
            {saved?.status === 'live' && <Link className="btn bt" href={`/listings/${saved.id}`}>View listing</Link>}
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ id, label, value, onChange, ...rest }: { id: string; label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id'>) {
  return (
    <div>
      <label className="lbl" htmlFor={id}>{label}</label>
      <input id={id} className="in" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}

function Blocks({ blocks, onAdd, onRemove }: { blocks: Saved['blocks']; onAdd: (s: string, e: string, r: string) => Promise<void>; onRemove: (id: string) => void }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {blocks.map((b) => (
        <div key={b.id} className="li">
          <span style={{ flex: 1 }} className="sm">
            {new Date(b.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} → {new Date(b.end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            {b.reason ? ` · ${b.reason}` : ''}
          </span>
          <button type="button" className="btn bt" style={{ minHeight: 32 }} onClick={() => onRemove(b.id)}>Remove</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div><label className="lbl" htmlFor="bs">From</label><input id="bs" type="date" className="in" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div><label className="lbl" htmlFor="be">To</label><input id="be" type="date" className="in" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        <div style={{ flex: '1 1 160px' }}><label className="lbl" htmlFor="br">Reason</label><input id="br" className="in" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Servicing" /></div>
        <button type="button" className="btn bs" disabled={!start || !end} onClick={() => void onAdd(start, `${end}T23:59`, reason).then(() => { setStart(''); setEnd(''); setReason(''); })}>Block dates</button>
      </div>
    </div>
  );
}
