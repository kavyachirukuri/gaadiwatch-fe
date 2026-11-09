'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { inr, inrShort } from '@/lib/format';
import { searchBuy, searchRent, TRACKING_LABEL, fuelLabel, type BuyResult, type Page, type RentResult } from '@/lib/listings-api';
import { useMeta } from '@/lib/use-meta';

/** "Rent near …" and "For sale in …" sections on the Home page, loaded from the API. */
export function HomeListings() {
  const { meta, error: metaError } = useMeta();
  const [rent, setRent] = useState<Page<RentResult> | null>(null);
  const [buy, setBuy] = useState<Page<BuyResult> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const city = meta?.cities[0];
  const defaultArea = meta?.areas.find((a) => a.city === city?.key);

  useEffect(() => {
    if (!city || !defaultArea) return;
    const controller = new AbortController();
    const area = `${defaultArea.name}, ${city.name}`;
    Promise.all([
      searchRent({ area, pageSize: 4, sort: 'distance' }, controller.signal),
      searchBuy({ area: city.name, radius: 50, pageSize: 4, sort: 'newest' }, controller.signal),
    ])
      .then(([r, b]) => {
        setRent(r);
        setBuy(b);
      })
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => controller.abort();
  }, [city, defaultArea]);

  const problem = metaError ?? error;
  if (problem) {
    return (
      <div className="note r" role="alert">
        <span>
          <strong>Couldn&apos;t load listings.</strong> {problem}. Check the backend is running on port 4000.
        </span>
      </div>
    );
  }

  const rentQuery = city && defaultArea ? `?location=${encodeURIComponent(`${defaultArea.name}, ${city.name}`)}&type=any` : '';
  const buyQuery = city ? `?location=${encodeURIComponent(city.name)}&radius=50` : '';

  return (
    <>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-busy={!rent}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 28 }}>{rent ? `Rent near ${rent.center.name}` : 'Rent near you'}</h2>
          <Link href={`/rent${rentQuery}`}>See all rentals</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {!rent && <SkeletonCards />}
          {rent?.items.map((l) => (
            <Link key={l.id} href={`/listings/${l.id}`} className="card" style={{ overflow: 'hidden', textDecoration: 'none', color: 'var(--ink)', display: 'flex', flexDirection: 'column' }}>
              <div className="ph" style={{ height: 160, borderRadius: 0 }}>Photo · {l.title}</div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{l.title} · {l.year}</strong>
                  <span className="sm mut">{l.distanceKm} km</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className={`chip ${l.gpsTracked ? 'tr' : ''}`}>{TRACKING_LABEL[l.trackingSource]}</span>
                  <span className="chip ok">Licensed operator</span>
                  {l.instantBook && <span className="chip">Instant book</span>}
                </div>
                <div>
                  <strong>{inr(l.pricePerDay)}</strong>
                  <span className="sm mut">/day{l.pricePerHour ? ` · ${inr(l.pricePerHour)}/hr` : ''}</span>
                </div>
                <div className="sm mut">{l.operator}{l.rating !== null ? ` · ${l.rating} ★` : ''}</div>
              </div>
            </Link>
          ))}
          {rent && rent.items.length === 0 && <p className="mut">No rentals listed near here yet.</p>}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-busy={!buy}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 28 }}>{city ? `For sale in ${city.name}` : 'For sale near you'}</h2>
          <Link href={`/buy${buyQuery}`}>See all for sale</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {!buy && <SkeletonCards />}
          {buy?.items.map((l) => (
            <Link key={l.id} href={`/listings/${l.id}`} className="card" style={{ overflow: 'hidden', textDecoration: 'none', color: 'var(--ink)' }}>
              <div className="ph" style={{ height: 150, borderRadius: 0 }}>Photo · {l.title}</div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <strong>{l.title} · {l.year}</strong>
                <div className="sm mut">
                  {fuelLabel(l.fuel)} · {(l.kmDriven ?? 0).toLocaleString('en-IN')} km · {l.seller === 'commercial' ? 'commercial' : 'private'} · {l.area}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 18 }}>{inrShort(l.price)}</strong>
                  <span className={`chip ${l.openToOffers ? 'ok' : ''}`}>{l.openToOffers ? 'Open to offers' : 'Fixed price'}</span>
                </div>
              </div>
            </Link>
          ))}
          {buy && buy.items.length === 0 && <p className="mut">No vehicles for sale here yet.</p>}
        </div>
      </section>
    </>
  );
}

function SkeletonCards() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="card" aria-hidden="true" style={{ height: 290, background: '#fff' }}>
          <div className="ph" style={{ height: 150, borderRadius: 0 }} />
        </div>
      ))}
    </>
  );
}
