'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SaveSearchButton } from '@/components/SaveSearchButton';
import { inr } from '@/lib/format';
import { typeOptions, useMeta } from '@/lib/use-meta';
import {
  fuelLabel,
  projectToMap,
  searchRent,
  TRACKING_LABEL,
  type Page,
  type RentResult,
} from '@/lib/listings-api';

type SortKey = 'distance' | 'price' | 'newest';
type View = 'both' | 'list' | 'map';
type Fuel = 'petrol' | 'electric' | 'cng' | 'diesel';

/** "Scooters" → { one: 'scooter', many: 'scooters' } (EVs keep their capitals) */
function nouns(label: string | undefined) {
  if (!label) return { one: 'vehicle', many: 'vehicles' };
  const many = label === label.toUpperCase() || /^[A-Z]{2}/.test(label) ? label : label.toLowerCase();
  return { one: many.replace(/ies$/, 'y').replace(/s$/, ''), many };
}

const FUELS: { value: Fuel; label: string }[] = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'electric', label: 'Electric (EV)' },
  { value: 'cng', label: 'CNG' },
  { value: 'diesel', label: 'Diesel' },
];
const ALL_FUELS: Fuel[] = ['petrol', 'electric', 'cng', 'diesel'];

const PRICE_MIN = 200;
const PRICE_MAX = 3000;
const PAGE_SIZE = 4;

function rentalDays(from: string, to: string): number {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 1;
  return Math.max(1, Math.ceil((end - start) / 86_400_000));
}

function formatRange(from: string, to: string): string | null {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const fmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export function RentSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const { meta } = useMeta();

  // Search bar (applied when "Update" is pressed → written to the URL)
  const [location, setLocation] = useState(params.get('location') ?? '');
  const [type, setType] = useState(params.get('type') ?? 'any');
  const [from, setFrom] = useState(params.get('from') ?? '');
  const [to, setTo] = useState(params.get('to') ?? '');

  // Filters (apply instantly)
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [fuels, setFuels] = useState<Fuel[]>(ALL_FUELS);
  const [yearFrom, setYearFrom] = useState(2015);
  const [kmMax, setKmMax] = useState(1_000_000);
  const [gpsOnly, setGpsOnly] = useState(false);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [instantOnly, setInstantOnly] = useState(false);

  const [sort, setSort] = useState<SortKey>('distance');
  const [view, setView] = useState<View>('both');
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Server data
  const [data, setData] = useState<Page<RentResult> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const appliedType = params.get('type') ?? 'any';
  const appliedLocation = params.get('location') ?? '';
  const appliedFrom = params.get('from') ?? '';
  const appliedTo = params.get('to') ?? '';
  const days = rentalDays(appliedFrom, appliedTo);
  const dateLabel = formatRange(appliedFrom, appliedTo);

  // Fetch from the API whenever the search, filters, sort or page change
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setError(null);
      if (fuels.length === 0) {
        // No fuel type ticked → nothing can match
        setData((prev) => (prev ? { ...prev, items: [], total: 0 } : prev));
        setLoading(false);
        return;
      }
      setLoading(true);
      searchRent(
        {
          area: appliedLocation,
          type: appliedType,
          from: appliedFrom ? new Date(appliedFrom).toISOString() : undefined,
          to: appliedTo ? new Date(appliedTo).toISOString() : undefined,
          maxPrice: maxPrice < PRICE_MAX ? maxPrice : undefined,
          fuels: fuels.length === ALL_FUELS.length ? undefined : fuels.join(','),
          yearFrom,
          kmMax: kmMax < 1_000_000 ? kmMax : undefined,
          gps: gpsOnly,
          delivery: deliveryOnly,
          instant: instantOnly,
          sort,
          page,
          pageSize: PAGE_SIZE,
        },
        controller.signal,
      )
        .then((res) => setData(res))
        .catch((e: Error) => {
          if (e.name !== 'AbortError') setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250); // small delay so dragging the price slider doesn't send dozens of requests
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [appliedLocation, appliedType, appliedFrom, appliedTo, maxPrice, fuels, yearFrom, kmMax, gpsOnly, deliveryOnly, instantOnly, sort, page]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const label = nouns(meta?.vehicleCategories.find((c) => c.key === appliedType)?.label);
  const area = data?.center.name ?? (appliedLocation.split(',')[0] || 'you');
  const cityName = (key: string) => meta?.cities.find((c) => c.key === key)?.name ?? key;
  const project = data ? projectToMap(items, data.center) : null;

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams({ location, type });
    if (from) next.set('from', from);
    if (to) next.set('to', to);
    setPage(1);
    router.replace(`/rent?${next.toString()}`, { scroll: false });
  }

  function toggleFuel(f: Fuel) {
    setPage(1);
    setFuels((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }

  function clearFilters() {
    setMaxPrice(PRICE_MAX);
    setFuels(ALL_FUELS);
    setYearFrom(2015);
    setKmMax(1_000_000);
    setGpsOnly(false);
    setDeliveryOnly(false);
    setInstantOnly(false);
    setPage(1);
  }

  return (
    <>
      {/* Search bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--line)' }}>
        <form onSubmit={applySearch} className="wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end', paddingTop: 16, paddingBottom: 16 }}>
          <div style={{ flex: '2 1 240px' }}>
            <label className="lbl" htmlFor="rs-loc">Location</label>
            <input id="rs-loc" className="in" value={location} placeholder="Area or city" onChange={(e) => setLocation(e.target.value)} list="rs-areas" />
            <datalist id="rs-areas">
              {meta?.areas.map((a) => <option key={`${a.city}-${a.name}`} value={`${a.name}, ${cityName(a.city)}`} />)}
            </datalist>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label className="lbl" htmlFor="rs-type">Type</label>
            <select id="rs-type" className="in" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="any">Any vehicle</option>
              {typeOptions(meta, 'rent').map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 190px' }}>
            <label className="lbl" htmlFor="rs-from">Pick-up</label>
            <input id="rs-from" className="in" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 190px' }}>
            <label className="lbl" htmlFor="rs-to">Return</label>
            <input id="rs-to" className="in" type="datetime-local" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button type="submit" className="btn bp">Update</button>
        </form>
      </div>

      <main className="wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        {/* Filters */}
        <aside className="card" aria-label="Filters" style={{ flex: '1 1 240px', maxWidth: 280, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Filters</strong>
            <button type="button" className="btn bt sm" style={{ minHeight: 32, padding: 0 }} onClick={clearFilters}>Clear all</button>
          </div>

          <div>
            <label className="lbl" htmlFor="f-price">Price per day, up to {maxPrice >= PRICE_MAX ? 'any' : inr(maxPrice)}</label>
            <input id="f-price" type="range" min={PRICE_MIN} max={PRICE_MAX} step={50} value={maxPrice}
              onChange={(e) => { setMaxPrice(Number(e.target.value)); setPage(1); }}
              style={{ width: '100%', accentColor: 'var(--green)' }} />
            <div className="sm mut" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{inr(PRICE_MIN)}</span><span>{inr(PRICE_MAX)}+</span>
            </div>
          </div>

          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <legend className="lbl">Fuel</legend>
            {FUELS.map((f) => (
              <label key={f.value} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={fuels.includes(f.value)} onChange={() => toggleFuel(f.value)}
                  style={{ width: 18, height: 18, accentColor: 'var(--green)' }} />
                {f.label}
              </label>
            ))}
          </fieldset>

          <div>
            <label className="lbl" htmlFor="f-year">Model year from</label>
            <select id="f-year" className="in" value={yearFrom} onChange={(e) => { setYearFrom(Number(e.target.value)); setPage(1); }}>
              {[2015, 2017, 2019, 2021, 2023].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div>
            <label className="lbl" htmlFor="f-km">Km driven up to</label>
            <select id="f-km" className="in" value={kmMax} onChange={(e) => { setKmMax(Number(e.target.value)); setPage(1); }}>
              <option value={10000}>10,000 km</option>
              <option value={30000}>30,000 km</option>
              <option value={50000}>50,000 km</option>
              <option value={1000000}>Any</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Toggle label="GPS tracked only" on={gpsOnly} onChange={(v) => { setGpsOnly(v); setPage(1); }} />
            <Toggle label="Delivery available" on={deliveryOnly} onChange={(v) => { setDeliveryOnly(v); setPage(1); }} />
            <Toggle label="Instant book" on={instantOnly} onChange={(v) => { setInstantOnly(v); setPage(1); }} />
          </div>

          <p className="xs mut">All rentals are commercially registered vehicles from verified, licensed operators.</p>
        </aside>

        {/* Results */}
        <section className="main" aria-label="Results" aria-busy={loading}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 24 }}>
                {loading && !data ? 'Searching…' : `${total} ${total === 1 ? label.one : label.many} near ${area}`}
              </h1>
              <p className="sm mut">
                {dateLabel ? `${dateLabel} · ` : ''}{days} {days === 1 ? 'day' : 'days'}
                {dateLabel ? ' · only vehicles free on these dates' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="sm" htmlFor="rs-sort">Sort</label>
              <select id="rs-sort" className="in" style={{ width: 'auto' }} value={sort} onChange={(e) => { setSort(e.target.value as SortKey); setPage(1); }}>
                <option value="distance">Distance</option>
                <option value="price">Price: low to high</option>
                <option value="newest">Newest</option>
              </select>
              <div className="seg" role="group" aria-label="View">
                {([['both', 'List + map'], ['list', 'List'], ['map', 'Map']] as [View, string][]).map(([v, text]) => (
                  <button key={v} type="button" className={view === v ? 'on' : ''} aria-pressed={view === v} onClick={() => setView(v)}>{text}</button>
                ))}
              </div>
              <SaveSearchButton mode="rent" label={`${label.many[0].toUpperCase()}${label.many.slice(1)} near ${area}`} text="Save search & alert me" />
            </div>
          </div>

          {error && (
            <div className="note r" role="alert">
              <span>
                <strong>Couldn&apos;t load vehicles.</strong> {error}. Check the backend is running on port 4000 (<code>npm run start:dev</code> in gaadiwatch-be).
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start', opacity: loading && data ? 0.6 : 1, transition: 'opacity .15s' }}>
            {view !== 'map' && (
              <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                {!loading && !error && items.length === 0 ? (
                  <div className="card" style={{ padding: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                    <strong>No vehicles match these filters</strong>
                    <p className="sm mut">Try a higher price, more fuel types, other dates, or turn off some toggles.</p>
                    <button type="button" className="btn bs" onClick={clearFilters}>Clear all filters</button>
                  </div>
                ) : (
                  items.map((l) => (
                    <ResultCard key={l.id} listing={l} days={days} active={activeId === l.id} onHover={setActiveId} dates={appliedFrom && appliedTo ? `?from=${encodeURIComponent(appliedFrom)}&to=${encodeURIComponent(appliedTo)}` : ''} />
                  ))
                )}

                {pageCount > 1 && (
                  <nav aria-label="Pages" style={{ display: 'flex', gap: 8, justifyContent: 'center', paddingTop: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="btn bs" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                      <button key={n} type="button" className={`btn ${n === page ? 'bp' : 'bs'}`} aria-current={n === page ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>
                    ))}
                    <button type="button" className="btn bs" disabled={page === pageCount} onClick={() => setPage(page + 1)}>Next</button>
                  </nav>
                )}
              </div>
            )}

            {view !== 'list' && (
              <div className="map card" style={{ flex: '1 1 380px', height: view === 'map' ? 720 : 640, borderRadius: 14 }} role="region" aria-label="Map of results on this page">
                <div className="road" style={{ left: -40, top: 300, width: 800, transform: 'rotate(-18deg)' }} />
                <div className="road" style={{ left: 200, top: -20, width: 700, transform: 'rotate(72deg)' }} />
                {project && items.map((l) => {
                  const pos = project(l);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      className={`pin ${activeId === l.id ? 'on' : ''}`}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%`, cursor: 'pointer', zIndex: activeId === l.id ? 2 : 1 }}
                      aria-label={`${l.title}, ${inr(l.pricePerDay)} per day`}
                      onMouseEnter={() => setActiveId(l.id)}
                      onFocus={() => setActiveId(l.id)}
                      onClick={() => router.push(`/listings/${l.id}`)}
                    >
                      {inr(l.pricePerDay)}
                    </button>
                  );
                })}
                {project && data && (() => {
                  const me = project(data.center);
                  return <div role="img" aria-label={`Search centre: ${data.center.name}`} style={{ position: 'absolute', left: `${me.x}%`, top: `${me.y}%`, width: 16, height: 16, borderRadius: '50%', background: 'var(--ink)', border: '3px solid #fff' }} />;
                })()}
                <span className="chip" style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 3, background: '#fff' }}>
                  Map preview · real map coming soon
                </span>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span>{label}</span>
      <button type="button" className={`tog ${on ? 'on' : ''}`} aria-label={label} aria-pressed={on} onClick={() => onChange(!on)} />
    </div>
  );
}

function ResultCard({ listing: l, days, active, onHover, dates }: { listing: RentResult; days: number; active: boolean; onHover: (id: string | null) => void; dates: string }) {
  return (
    <Link
      href={`/listings/${l.id}${dates}`}
      className="card"
      onMouseEnter={() => onHover(l.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(l.id)}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 14, padding: 12, textDecoration: 'none', color: 'var(--ink)', borderColor: active ? 'var(--green)' : undefined }}
    >
      {l.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={l.photo} alt="" style={{ width: 150, height: 112, flex: 'none', objectFit: 'cover', borderRadius: 10 }} />
      ) : (
        <div className="ph" style={{ width: 150, height: 112, flex: 'none' }}>Photo</div>
      )}
      <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <strong>{l.title} · {l.year}</strong>
          <span className="sm mut">{l.distanceKm} km</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className={`chip ${l.gpsTracked ? 'tr' : ''}`}>{TRACKING_LABEL[l.trackingSource]}</span>
          <span className="chip">{fuelLabel(l.fuel)}</span>
          {l.deliveryFee !== null && <span className="chip">{l.deliveryFee === 0 ? 'Delivery free' : `Delivery ${inr(l.deliveryFee)}`}</span>}
          {l.instantBook && <span className="chip ok">Instant book</span>}
        </div>
        <div className="sm mut">
          {l.operator}
          {l.rating !== null ? ` · ${l.rating} ★` : ''}
          {l.replyMinutes !== null ? ` · replies in ~${l.replyMinutes} min` : ''}
        </div>
        <div>
          <strong>{inr(l.pricePerDay)}</strong>
          <span className="sm mut">/day · {inr(l.pricePerDay * days)} for {days} {days === 1 ? 'day' : 'days'} · deposit {inr(l.deposit)}</span>
        </div>
      </div>
    </Link>
  );
}
