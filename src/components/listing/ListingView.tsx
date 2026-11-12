'use client';

import Link from 'next/link';
import { ContactButton } from './ContactButton';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { inr, inrShort } from '@/lib/format';
import { fuelLabel, getListing, NotFoundError, TRACKING_LABEL, type ListingDetail } from '@/lib/listings-api';
import { useMeta } from '@/lib/use-meta';

const DAY = 86_400_000;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ListingView() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const { meta } = useMeta();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [error, setError] = useState<{ kind: 'notfound' | 'other'; message: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getListing(id, controller.signal)
      .then(setListing)
      .catch((e: Error) => {
        if (e.name === 'AbortError') return;
        setError(e instanceof NotFoundError ? { kind: 'notfound', message: e.message } : { kind: 'other', message: e.message });
      });
    return () => controller.abort();
  }, [id]);

  if (error?.kind === 'notfound') {
    return (
      <main className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <h1 style={{ fontSize: 28 }}>This listing isn&apos;t available</h1>
        <p className="mut">It may have been sold, paused or removed by the owner.</p>
        <Link className="btn bp" href="/rent">Browse rentals</Link>
      </main>
    );
  }
  if (error) {
    return (
      <main className="wrap">
        <div className="note r" role="alert"><span><strong>Couldn&apos;t load this listing.</strong> {error.message}. Check the backend is running on port 4000.</span></div>
      </main>
    );
  }
  if (!listing) {
    return <main className="wrap mut" aria-busy="true">Loading vehicle…</main>;
  }

  const cityName = meta?.cities.find((c) => c.key === listing.city)?.name ?? listing.city;
  return <Detail listing={listing} cityName={cityName} initialFrom={search.get('from') ?? ''} initialTo={search.get('to') ?? ''} />;
}

function Detail({ listing: l, cityName, initialFrom, initialTo }: { listing: ListingDetail; cityName: string; initialFrom: string; initialTo: string }) {
  const v = l.vehicle;
  const backHref = l.rent
    ? `/rent?location=${encodeURIComponent(`${l.area}, ${cityName}`)}`
    : `/buy?location=${encodeURIComponent(`${l.area}, ${cityName}`)}`;

  return (
    <main className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <nav className="sm" aria-label="Breadcrumb">
        <Link href={backHref}>{l.rent ? 'Rentals' : 'For sale'} in {l.area}</Link> <span className="mut">/ {l.title}</span>
      </nav>

      <Gallery listing={l} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
        <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {l.rent && <span className="chip ok">For rent</span>}
              {l.sale && <span className="chip ok">For sale</span>}
              <span className={`chip ${l.tracking.gpsTracked ? 'tr' : ''}`}>{TRACKING_LABEL[l.tracking.source]}</span>
              <span className="chip">{v.registrationType === 'commercial' ? 'Commercial RC verified' : 'Private vehicle · RC verified'}</span>
            </div>
            <h1 style={{ fontSize: 34 }}>{l.title} · {v.year}</h1>
            <p className="mut">
              {l.area}, {cityName}
              {l.rating.average !== null ? ` · ${l.rating.average} ★ (${l.rating.count} ${l.rating.count === 1 ? 'review' : 'reviews'})` : ''}
              {l.completedTrips > 0 ? ` · ${l.completedTrips} trips` : ''}
              {' · '}<Link href={`/help?listing=${l.id}&what=${encodeURIComponent(`Listing · ${l.title}`)}`}>Report listing</Link>
            </p>
            {l.description && <p>{l.description}</p>}
          </section>

          <section className="card" aria-label="Specifications" style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            <Spec label="Type" value={v.typeLabel} />
            <Spec label="Make / model" value={`${v.make} ${v.model}`} />
            <Spec label="Year" value={String(v.year)} />
            <Spec label="Fuel" value={fuelLabel(v.fuel)} />
            {v.odometerKm !== null && <Spec label="Odometer" value={`${v.odometerKm.toLocaleString('en-IN')} km`} />}
            <Spec label="Registration" value={v.registrationMasked} />
            {l.rent && <Spec label="Licence needed" value={v.licenceRequired} />}
            {l.rent?.helmetsIncluded ? <Spec label="Helmets" value={`${l.rent.helmetsIncluded} included`} /> : null}
            {l.sale && <Spec label="Owners" value={String(v.ownerCount)} />}
          </section>

          {l.rent && <RentalTerms rent={l.rent} />}

          {l.rent && l.tracking.source !== 'none' && (
            <section className="note" aria-labelledby="trk" style={{ flexDirection: 'column', gap: 6, padding: 18 }}>
              <strong id="trk">This vehicle is tracked live during your rental</strong>
              <span>
                The operator sees its location, speed and route only while your rental is active
                {l.rent.allowedArea ? `, and gets alerts if it leaves the allowed area (${l.rent.allowedArea})` : ''}
                {l.rent.speedLimitKmph ? ` or goes over ${l.rent.speedLimitKmph} km/h` : ''}. You&apos;ll agree to this before booking.
              </span>
            </section>
          )}

          {l.rent && <Availability bookedRanges={l.bookedRanges} from={initialFrom} to={initialTo} />}

          <SellerCard listing={l} />

          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-labelledby="rv">
            <h2 id="rv" style={{ fontSize: 22 }}>Reviews</h2>
            {l.reviews.length === 0 && <p className="mut">No reviews yet. Reviews appear after completed trips.</p>}
            {l.reviews.map((r) => (
              <div key={r.id} className="card" style={{ padding: 16 }}>
                <strong>{r.rating} ★ · {r.author}</strong>{' '}
                <span className="sm mut">· {new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(r.createdAt))}</span>
                {r.comment && <p style={{ marginTop: 6 }}>{r.comment}</p>}
              </div>
            ))}
          </section>
        </div>

        <aside style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {l.rent && <BookingCard listing={l} initialFrom={initialFrom} initialTo={initialTo} />}
          {l.sale && <SaleCard listing={l} />}
        </aside>
      </div>

      {l.similar.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 22 }}>Similar {l.rent ? 'rentals' : 'vehicles'} nearby</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {l.similar.map((s) => (
              <Link key={s.id} className="card" href={`/listings/${s.id}`} style={{ padding: 12, textDecoration: 'none', color: 'var(--ink)' }}>
                <div className="ph" style={{ height: 110 }}>Photo</div>
                <strong style={{ display: 'block', marginTop: 8 }}>
                  {s.title} · {s.unit === 'day' ? `${inr(s.price)}/day` : inrShort(s.price)}
                </strong>
                <span className="sm mut">{s.distanceKm} km away{s.rating !== null ? ` · ${s.rating} ★` : ''}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="sm mut">{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

function Gallery({ listing: l }: { listing: ListingDetail }) {
  const tiles = l.photos.slice(0, 5);
  const placeholders = ['Main photo', 'Side', 'Rear', 'Odometer', 'Details'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gridAutoRows: 180, gap: 8 }}>
      {placeholders.map((label, i) => {
        const photo = tiles.at(i);
        const style = i === 0 ? { gridRow: 'span 2', gridColumn: 'span 2' } : undefined;
        return photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={photo.id} src={photo.url} alt={`${l.title} photo ${i + 1}`} style={{ ...style, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
        ) : (
          <div key={label} className="ph" style={style}>{label}</div>
        );
      })}
    </div>
  );
}

function RentalTerms({ rent }: { rent: NonNullable<ListingDetail['rent']> }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-labelledby="pr">
      <h2 id="pr" style={{ fontSize: 22 }}>Rental prices</h2>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              {rent.pricePerHour !== null && <th>Per hour</th>}
              <th>Per day</th>
              {rent.pricePerWeek !== null && <th>Per week</th>}
              {rent.pricePerMonth !== null && <th>Per month</th>}
              <th>Deposit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {rent.pricePerHour !== null && <td>{inr(rent.pricePerHour)}</td>}
              <td><strong>{inr(rent.pricePerDay)}</strong></td>
              {rent.pricePerWeek !== null && <td>{inr(rent.pricePerWeek)}</td>}
              {rent.pricePerMonth !== null && <td>{inr(rent.pricePerMonth)}</td>}
              <td>{inr(rent.deposit)} refundable</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="sm" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {rent.freeKmPerDay !== null && (
          <div className="card" style={{ padding: 14 }}>
            <strong>{rent.freeKmPerDay} km free per day</strong>
            {rent.extraKmCharge !== null && <div className="mut">then {inr(rent.extraKmCharge)} per km</div>}
          </div>
        )}
        {rent.lateFeePerHour !== null && (
          <div className="card" style={{ padding: 14 }}>
            <strong>Late return</strong>
            <div className="mut">{inr(rent.lateFeePerHour)} per hour{rent.lateGraceMinutes ? ` after ${rent.lateGraceMinutes} min grace` : ''}</div>
          </div>
        )}
        <div className="card" style={{ padding: 14 }}>
          <strong>Fuel</strong>
          <div className="mut">
            {rent.fuelChargePerLitre !== null ? `Return at the same level, or ${inr(rent.fuelChargePerLitre)}/litre` : 'Electric — return with at least the same charge'}
          </div>
        </div>
        {rent.cancellation.summary && (
          <div className="card" style={{ padding: 14 }}>
            <strong>{rent.cancellation.label}</strong>
            <div className="mut">{rent.cancellation.summary}</div>
          </div>
        )}
      </div>
    </section>
  );
}

function overlapsDay(day: Date, ranges: { start: string; end: string }[]) {
  const s = day.getTime();
  const e = s + DAY;
  return ranges.some((r) => Date.parse(r.start) < e && Date.parse(r.end) > s);
}

function Availability({ bookedRanges, from, to }: { bookedRanges: ListingDetail['bookedRanges']; from: string; to: string }) {
  const start = from ? new Date(from) : new Date();
  const [month, setMonth] = useState(() => new Date(start.getFullYear(), start.getMonth(), 1));

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // Monday-first
    const fromT = from ? new Date(new Date(from).toDateString()).getTime() : null;
    const toT = to ? new Date(new Date(to).toDateString()).getTime() : null;
    const today = new Date(new Date().toDateString()).getTime();
    const list: { key: string; label: string; cls: string }[] = [];
    for (let i = 0; i < lead; i++) list.push({ key: `e${i}`, label: '', cls: '' });
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(month.getFullYear(), month.getMonth(), d);
      const t = day.getTime();
      let cls = '';
      if (t < today || overlapsDay(day, bookedRanges)) cls = 'bl';
      if (fromT !== null && toT !== null && t >= fromT && t <= toT) cls = t === fromT || t === toT ? 'sel' : 'rg';
      list.push({ key: `d${d}`, label: String(d), cls });
    }
    return list;
  }, [month, bookedRanges, from, to]);

  const title = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(month);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-labelledby="av">
      <h2 id="av" style={{ fontSize: 22 }}>Availability</h2>
      <div className="card" style={{ padding: 18, maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" className="btn bs" style={{ minHeight: 36 }} aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
          <strong>{title}</strong>
          <button type="button" className="btn bs" style={{ minHeight: 36 }} aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
        </div>
        <div className="cal">
          {WEEKDAYS.map((w) => <b key={w} className="xs mut">{w}</b>)}
          {cells.map((c) => <span key={c.key} className={c.cls}>{c.label}</span>)}
        </div>
        <div className="xs mut" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span>Struck through = booked or past</span>
          <span>Green = your dates</span>
        </div>
      </div>
    </section>
  );
}

function SellerCard({ listing: l }: { listing: ListingDetail }) {
  const s = l.seller;
  const since = new Date(s.memberSince).getFullYear();
  return (
    <section className="card" aria-label="Seller" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="av" style={{ width: 56, height: 56, fontSize: 18 }}>{s.initials}</div>
      <div style={{ flex: '1 1 240px' }}>
        <strong>{s.name}</strong>
        <div className="sm mut">
          {s.kind === 'operator' ? 'Licensed operator' : 'Private seller'} · {s.vehicleCount} {s.vehicleCount === 1 ? 'vehicle' : 'vehicles'} · on GaadiWatch since {since}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {s.kycVerified && <span className="chip ok">KYC verified</span>}
          {s.gstinVerified && <span className="chip ok">GSTIN verified</span>}
          {s.kind === 'operator' && s.licenceVerified && <span className="chip ok">Rental licence verified</span>}
        </div>
      </div>
      {(s.rating !== null || s.replyMinutes !== null) && (
        <div className="sm" style={{ textAlign: 'right' }}>
          {s.rating !== null && <strong>{s.rating} ★</strong>}
          {s.replyMinutes !== null && <div className="mut">Replies in ~{s.replyMinutes} min</div>}
        </div>
      )}
      <ContactButton listingId={l.id}>Message {s.kind === 'operator' ? 'operator' : 'seller'}</ContactButton>
    </section>
  );
}

function BookingCard({ listing: l, initialFrom, initialTo }: { listing: ListingDetail; initialFrom: string; initialTo: string }) {
  const rent = l.rent!;
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [delivery, setDelivery] = useState(false);
  const [openedAt] = useState(() => Date.now()); // used to reject pick-up times in the past

  const start = Date.parse(from);
  const end = Date.parse(to);
  const valid = !Number.isNaN(start) && !Number.isNaN(end) && end > start && start >= openedAt - 60_000;
  const hours = valid ? Math.ceil((end - start) / 3_600_000) : 0;
  const days = valid ? Math.max(1, Math.ceil(hours / 24)) : 0;
  // Short trips: hourly price, but never more than the day price
  const useHourly = valid && hours < 24 && rent.pricePerHour !== null;
  const rentAmount = !valid ? 0 : useHourly ? Math.min(hours * rent.pricePerHour!, rent.pricePerDay) : days * rent.pricePerDay;
  const deliveryFee = delivery && rent.deliveryFee !== null ? rent.deliveryFee : 0;
  const total = rentAmount + rent.bookingFee + deliveryFee + rent.deposit;
  const clash = valid && l.bookedRanges.some((r) => Date.parse(r.start) < end && Date.parse(r.end) > start);

  const bookParams = new URLSearchParams({ from, to });
  if (delivery) bookParams.set('delivery', '1');
  const bookHref = `/book/${l.id}?${bookParams.toString()}`;

  return (
    <section className="card" aria-labelledby="bk" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 8px 24px rgba(0,0,0,.06)' }}>
      <h2 id="bk" style={{ fontSize: 20 }}>
        {inr(rent.pricePerDay)} <span className="sm mut" style={{ fontFamily: 'var(--font-body)' }}>/ day</span>
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        <div>
          <label className="lbl" htmlFor="bk-from">Pick-up</label>
          <input id="bk-from" className="in" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="lbl" htmlFor="bk-to">Return</label>
          <input id="bk-to" className="in" type="datetime-local" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="lbl" htmlFor="bk-hand">Hand-over</label>
        <select id="bk-hand" className="in" value={delivery ? 'delivery' : 'pickup'} onChange={(e) => setDelivery(e.target.value === 'delivery')}>
          <option value="pickup">Pick up at {l.area}</option>
          {rent.deliveryFee !== null && (
            <option value="delivery">Deliver to me ({rent.deliveryFee === 0 ? 'free' : `+${inr(rent.deliveryFee)}`})</option>
          )}
        </select>
      </div>

      {valid ? (
        <div className="sm" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Row label={useHourly ? `${inr(rent.pricePerHour!)} × ${hours} h` : `${inr(rent.pricePerDay)} × ${days} ${days === 1 ? 'day' : 'days'}`} value={inr(rentAmount)} />
          {rent.bookingFee > 0 && <Row label="Booking fee" value={inr(rent.bookingFee)} />}
          {delivery && <Row label="Delivery" value={deliveryFee === 0 ? 'Free' : inr(deliveryFee)} />}
          <Row label="Refundable deposit" value={inr(rent.deposit)} />
          <hr className="hr" />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Total today</span><span>{inr(total)}</span></div>
        </div>
      ) : (
        <p className="sm mut">Choose pick-up and return times to see the price.</p>
      )}

      {clash && (
        <div className="note w" role="alert"><span>This vehicle is already booked for part of these dates. Try other times.</span></div>
      )}

      {valid && !clash ? (
        <Link className="btn bp" href={bookHref}>{rent.instantBook ? 'Book now' : 'Request to book'}</Link>
      ) : (
        <button type="button" className="btn bp" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
          {rent.instantBook ? 'Book now' : 'Request to book'}
        </button>
      )}
      <p className="xs mut">
        {rent.instantBook
          ? 'Instant book: confirmed as soon as you pay.'
          : `The operator replies${l.seller.replyMinutes !== null ? ` in about ${l.seller.replyMinutes} min` : ' soon'}. You're charged only if they accept.`}
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SaleCard({ listing: l }: { listing: ListingDetail }) {
  const sale = l.sale!;
  return (
    <section className="card" aria-labelledby="sl" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {l.rent && <span className="k">Also for sale</span>}
      <h2 id="sl" style={{ fontSize: 22 }}>{inrShort(sale.price)}</h2>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span className={`chip ${sale.openToOffers ? 'ok' : ''}`}>{sale.openToOffers ? 'Open to offers' : 'Fixed price'}</span>
        {sale.serviceHistory && <span className="chip">Service history</span>}
        {sale.exRental && <span className="chip">Ex-rental</span>}
      </div>
      {sale.openToOffers && <ContactButton listingId={l.id} action="offer">Make an offer</ContactButton>}
      <ContactButton listingId={l.id} action="ride" className="btn bt">Book a test ride</ContactButton>
    </section>
  );
}
