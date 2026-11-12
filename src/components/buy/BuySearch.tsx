'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SaveSearchButton } from '@/components/SaveSearchButton';
import { inrShort } from '@/lib/format';
import { typeOptions, useMeta } from '@/lib/use-meta';
import { fuelLabel, projectToMap, searchBuy, type BuyResult, type Page } from '@/lib/listings-api';

type SortKey = 'newest' | 'price' | 'distance';
type View = 'grid' | 'map';
type Fuel = 'petrol' | 'diesel' | 'electric' | 'cng';
type Seller = 'private' | 'commercial';

/** "Lorries" → { one: 'lorry', many: 'lorries' } (EVs keep their capitals) */
function nouns(label: string | undefined) {
  if (!label) return { one: 'vehicle', many: 'vehicles' };
  const many = /^[A-Z]{2}/.test(label) ? label : label.toLowerCase();
  return { one: many.replace(/ies$/, 'y').replace(/s$/, ''), many };
}

const FUELS: { value: Fuel; label: string }[] = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'cng', label: 'CNG' },
];
const ALL_FUELS: Fuel[] = ['petrol', 'diesel', 'electric', 'cng'];
const ALL_SELLERS: Seller[] = ['private', 'commercial'];
const BUDGET_STEPS = [0, 25000, 50000, 100000, 200000, 300000, 500000, 700000, 1000000, 2000000, 5000000];
const NO_MAX = 5000000;
const PAGE_SIZE = 6;

function ownerLabel(n: number) {
  return n === 1 ? '1st owner' : n === 2 ? '2nd owner' : n === 3 ? '3rd owner' : `${n}th owner`;
}

const num = (v: string | null | undefined, fallback: number) =>
  v && !Number.isNaN(Number(v)) ? Number(v) : fallback;

export function BuySearch() {
  const router = useRouter();
  const params = useSearchParams();
  const { meta } = useMeta();
  const budgetParam = (params.get('budget') ?? '').split('-');

  // Values applied from the URL
  const aType = params.get('type') ?? 'any';
  const aMin = num(params.get('min') ?? budgetParam[0], 0);
  const aMax = num(params.get('max') ?? budgetParam[1], NO_MAX);
  const aArea = params.get('location') ?? '';
  const aRadius = num(params.get('radius'), 20);

  // Search bar (applied on "Search")
  const [type, setType] = useState(aType);
  const [budgetMin, setBudgetMin] = useState(aMin);
  const [budgetMax, setBudgetMax] = useState(aMax);
  const [area, setArea] = useState(aArea);
  const [radius, setRadius] = useState(aRadius);

  // Filters (apply instantly)
  const [fuels, setFuels] = useState<Fuel[]>(ALL_FUELS);
  const [yearFrom, setYearFrom] = useState(2010);
  const [kmMax, setKmMax] = useState(1_000_000);
  const [sellers, setSellers] = useState<Seller[]>(ALL_SELLERS);
  const [offersOnly, setOffersOnly] = useState(false);
  const [historyOnly, setHistoryOnly] = useState(false);
  const [gpsOnly, setGpsOnly] = useState(false);

  const [sort, setSort] = useState<SortKey>('newest');
  const [view, setView] = useState<View>('grid');
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [data, setData] = useState<Page<BuyResult> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setError(null);
      if (fuels.length === 0 || sellers.length === 0) {
        setData((prev) => (prev ? { ...prev, items: [], total: 0 } : prev));
        setLoading(false);
        return;
      }
      setLoading(true);
      searchBuy(
        {
          area: aArea,
          type: aType,
          minPrice: aMin || undefined,
          maxPrice: aMax < NO_MAX ? aMax : undefined,
          radius: aRadius,
          fuels: fuels.length === ALL_FUELS.length ? undefined : fuels.join(','),
          yearFrom,
          kmMax: kmMax < 1_000_000 ? kmMax : undefined,
          sellers: sellers.length === ALL_SELLERS.length ? undefined : sellers.join(','),
          offers: offersOnly,
          history: historyOnly,
          gps: gpsOnly,
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
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [aArea, aType, aMin, aMax, aRadius, fuels, yearFrom, kmMax, sellers, offersOnly, historyOnly, gpsOnly, sort, page]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const typeInfo = nouns(meta?.vehicleCategories.find((c) => c.key === aType)?.label);
  const cityName = (key: string) => meta?.cities.find((c) => c.key === key)?.name ?? key;
  const budgetLabel = aMin === 0 && aMax >= NO_MAX ? 'Any budget' : `${inrShort(aMin)} – ${aMax >= NO_MAX ? 'any' : inrShort(aMax)}`;
  const centreName = data?.center.name ?? (aArea.split(',')[0] || 'you');
  const project = data ? projectToMap(items, data.center) : null;

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams({ type, location: area, min: String(budgetMin), max: String(budgetMax), radius: String(radius) });
    setPage(1);
    router.replace(`/buy?${next.toString()}`, { scroll: false });
  }

  function toggle<T>(list: T[], value: T, set: (v: T[]) => void) {
    setPage(1);
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  function clearFilters() {
    setFuels(ALL_FUELS);
    setYearFrom(2010);
    setKmMax(1_000_000);
    setSellers(ALL_SELLERS);
    setOffersOnly(false);
    setHistoryOnly(false);
    setGpsOnly(false);
    setPage(1);
  }

  return (
    <>
      {/* Search bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--line)' }}>
        <form onSubmit={applySearch} className="wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end', paddingTop: 16, paddingBottom: 16 }}>
          <div style={{ flex: '1 1 170px' }}>
            <label className="lbl" htmlFor="bs-type">Vehicle type</label>
            <select id="bs-type" className="in" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="any">Any vehicle</option>
              {typeOptions(meta, 'buy').map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label className="lbl" htmlFor="bs-min">Budget from</label>
            <select id="bs-min" className="in" value={budgetMin} onChange={(e) => setBudgetMin(Number(e.target.value))}>
              {BUDGET_STEPS.slice(0, -1).map((v) => <option key={v} value={v}>{v === 0 ? 'No minimum' : inrShort(v)}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label className="lbl" htmlFor="bs-max">Budget to</label>
            <select id="bs-max" className="in" value={budgetMax} onChange={(e) => setBudgetMax(Number(e.target.value))}>
              {BUDGET_STEPS.slice(1).filter((v) => v > budgetMin).map((v) => <option key={v} value={v}>{v === NO_MAX ? 'No maximum' : inrShort(v)}</option>)}
            </select>
          </div>
          <div style={{ flex: '2 1 220px' }}>
            <label className="lbl" htmlFor="bs-area">Area</label>
            <input id="bs-area" className="in" value={area} placeholder="Area or city" onChange={(e) => setArea(e.target.value)} list="bs-areas" />
            <datalist id="bs-areas">
              {meta?.areas.map((a) => <option key={`${a.city}-${a.name}`} value={`${a.name}, ${cityName(a.city)}`} />)}
            </datalist>
          </div>
          <div style={{ flex: '1 1 130px' }}>
            <label className="lbl" htmlFor="bs-radius">Within</label>
            <select id="bs-radius" className="in" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
              {[5, 10, 15, 20, 50].map((r) => <option key={r} value={r}>{r} km</option>)}
            </select>
          </div>
          <button type="submit" className="btn bp">Search</button>
        </form>
      </div>

      <main className="wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        {/* Filters */}
        <aside className="card" aria-label="Filters" style={{ flex: '1 1 240px', maxWidth: 280, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Filters</strong>
            <button type="button" className="btn bt sm" style={{ minHeight: 32, padding: 0 }} onClick={clearFilters}>Clear all</button>
          </div>

          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <legend className="lbl">Fuel</legend>
            {FUELS.map((f) => (
              <Check key={f.value} label={f.label} checked={fuels.includes(f.value)} onChange={() => toggle(fuels, f.value, setFuels)} />
            ))}
          </fieldset>

          <div>
            <label className="lbl" htmlFor="bf-year">Year from</label>
            <select id="bf-year" className="in" value={yearFrom} onChange={(e) => { setYearFrom(Number(e.target.value)); setPage(1); }}>
              {[2010, 2015, 2018, 2020, 2022].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div>
            <label className="lbl" htmlFor="bf-km">Km driven up to</label>
            <select id="bf-km" className="in" value={kmMax} onChange={(e) => { setKmMax(Number(e.target.value)); setPage(1); }}>
              <option value={20000}>20,000 km</option>
              <option value={40000}>40,000 km</option>
              <option value={60000}>60,000 km</option>
              <option value={100000}>1,00,000 km</option>
              <option value={1000000}>Any</option>
            </select>
          </div>

          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <legend className="lbl">Seller</legend>
            <Check label="Private owner" checked={sellers.includes('private')} onChange={() => toggle<Seller>(sellers, 'private', setSellers)} />
            <Check label="Commercial / fleet" checked={sellers.includes('commercial')} onChange={() => toggle<Seller>(sellers, 'commercial', setSellers)} />
          </fieldset>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Toggle label="Open to offers" on={offersOnly} onChange={(v) => { setOffersOnly(v); setPage(1); }} />
            <Toggle label="Has service history" on={historyOnly} onChange={(v) => { setHistoryOnly(v); setPage(1); }} />
            <Toggle label="GPS tracked" on={gpsOnly} onChange={(v) => { setGpsOnly(v); setPage(1); }} />
          </div>
        </aside>

        {/* Results */}
        <section className="main" aria-label="Results" aria-busy={loading}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 24 }}>
                {loading && !data ? 'Searching…' : `${total} ${total === 1 ? typeInfo.one : typeInfo.many} for sale`}
              </h1>
              <p className="sm mut">{budgetLabel} · within {aRadius} km of {centreName}</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="sm" htmlFor="bs-sort">Sort</label>
              <select id="bs-sort" className="in" style={{ width: 'auto' }} value={sort} onChange={(e) => { setSort(e.target.value as SortKey); setPage(1); }}>
                <option value="newest">Newest</option>
                <option value="price">Price: low to high</option>
                <option value="distance">Distance</option>
              </select>
              <div className="seg" role="group" aria-label="View">
                <button type="button" className={view === 'grid' ? 'on' : ''} aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Grid</button>
                <button type="button" className={view === 'map' ? 'on' : ''} aria-pressed={view === 'map'} onClick={() => setView('map')}>Map</button>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', background: 'var(--green-tint)', borderColor: '#C3E2D7' }}>
            <div style={{ flex: '1 1 300px' }}>
              <strong>Get alerts for new {typeInfo.many} like these</strong>
              <div className="sm" style={{ color: '#0A5A49' }}>Push and WhatsApp when a matching listing goes live.</div>
            </div>
            <SaveSearchButton mode="buy" className="btn bp" label={`${typeInfo.many[0].toUpperCase()}${typeInfo.many.slice(1)} · ${budgetLabel} · near ${centreName}`} />
          </div>

          {error && (
            <div className="note r" role="alert">
              <span>
                <strong>Couldn&apos;t load vehicles.</strong> {error}. Check the backend is running on port 4000 (<code>npm run start:dev</code> in gaadiwatch-be).
              </span>
            </div>
          )}

          <div style={{ opacity: loading && data ? 0.6 : 1, transition: 'opacity .15s', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {!loading && !error && items.length === 0 ? (
              <div className="card" style={{ padding: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <strong>No vehicles match your search</strong>
                <p className="sm mut">Try a wider budget, a bigger distance, or fewer filters.</p>
                <button type="button" className="btn bs" onClick={clearFilters}>Clear all filters</button>
              </div>
            ) : view === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 18 }}>
                {items.map((l) => <SaleCard key={l.id} listing={l} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
                <div className="map card" style={{ flex: '2 1 420px', height: 620, borderRadius: 14 }} role="region" aria-label="Map of vehicles on this page">
                  <div className="road" style={{ left: -40, top: 280, width: 900, transform: 'rotate(-12deg)' }} />
                  <div className="road" style={{ left: 260, top: -20, width: 700, transform: 'rotate(70deg)' }} />
                  {project && items.map((l) => {
                    const pos = project(l);
                    return (
                      <button key={l.id} type="button" className={`pin ${activeId === l.id ? 'on' : ''}`}
                        style={{ left: `${pos.x}%`, top: `${pos.y}%`, cursor: 'pointer', zIndex: activeId === l.id ? 2 : 1 }}
                        aria-label={`${l.title}, ${inrShort(l.price)}`}
                        onMouseEnter={() => setActiveId(l.id)} onFocus={() => setActiveId(l.id)} onClick={() => setActiveId(l.id)}>
                        {inrShort(l.price).replace(' lakh', 'L')}
                      </button>
                    );
                  })}
                  <span className="chip" style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 3, background: '#fff' }}>
                    Map preview · real map coming soon
                  </span>
                </div>
                <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                  {(() => {
                    const picked = items.find((l) => l.id === activeId);
                    return picked ? <SaleCard listing={picked} /> : (
                      <div className="card" style={{ padding: 20 }}><p className="sm mut">Select a price on the map to see the vehicle.</p></div>
                    );
                  })()}
                </div>
              </div>
            )}

            {pageCount > 1 && (
              <nav aria-label="Pages" style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="btn bs" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" className={`btn ${n === page ? 'bp' : 'bs'}`} aria-current={n === page ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>
                ))}
                <button type="button" className="btn bs" disabled={page === pageCount} onClick={() => setPage(page + 1)}>Next</button>
              </nav>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 18, height: 18, accentColor: 'var(--green)' }} />
      {label}
    </label>
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

function SaleCard({ listing: l }: { listing: BuyResult }) {
  const sellerText = l.seller === 'commercial' ? 'fleet seller' : ownerLabel(l.ownerCount);
  return (
    <Link href={`/listings/${l.id}`} className="card" style={{ overflow: 'hidden', textDecoration: 'none', color: 'var(--ink)', borderColor: l.featured ? '#B86E00' : undefined, display: 'flex', flexDirection: 'column' }}>
      <div className="ph" style={{ height: 160, borderRadius: 0, position: 'relative', overflow: 'hidden' }}>
        {l.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <>Photo · {l.title}</>
        )}
        {l.featured && <span className="chip wa" style={{ position: 'absolute', left: 10, top: 10 }}>Featured</span>}
      </div>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <strong>{l.title} · {l.year}</strong>
        <div className="sm mut">
          {fuelLabel(l.fuel)} · {(l.kmDriven ?? 0).toLocaleString('en-IN')} km · {sellerText} · {l.area} · {l.distanceKm} km away
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="chip ok">RC verified</span>
          {l.serviceHistory && <span className="chip">Service history</span>}
          {l.gpsTracked && <span className="chip tr">GPS history</span>}
          {l.exRental && <span className="chip">Ex-rental</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontSize: 20 }}>{inrShort(l.price)}</strong>
          <span className={`chip ${l.openToOffers ? 'ok' : ''}`}>{l.openToOffers ? 'Open to offers' : 'Fixed price'}</span>
        </div>
      </div>
    </Link>
  );
}
