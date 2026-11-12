'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError, useRequireAuth } from '@/lib/auth';
import { inr } from '@/lib/format';
import { getListing, TRACKING_LABEL, type ListingDetail } from '@/lib/listings-api';

type Quote = {
  available: boolean;
  instantBook: boolean;
  licenceNeeded: string;
  damageProtectionCap: number;
  requestReplyHours: number;
  cancellation: { label: string; summary: string } | null;
  price: {
    hours: number;
    days: number;
    hourly: boolean;
    rent: number;
    bookingFee: number;
    gstOnFees: number;
    deliveryFee: number;
    damageProtection: number;
    rentalTotal: number;
    deposit: number;
    totalNow: number;
    freeKm: number | null;
  };
};

const PAYMENT_METHODS = [
  { key: 'upi', label: 'UPI', note: 'Pay with any UPI app' },
  { key: 'card', label: 'Credit / debit card', note: '' },
  { key: 'netbanking', label: 'Net banking', note: '' },
] as const;

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export function BookingCheckout() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const q = useSearchParams();
  const fromLocal = q.get('from') ?? '';
  const toLocal = q.get('to') ?? '';
  const delivery = q.get('delivery') === '1';

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [protection, setProtection] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [agreement, setAgreement] = useState(false);
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]['key']>('upi');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fromIso = fromLocal ? new Date(fromLocal).toISOString() : '';
  const toIso = toLocal ? new Date(toLocal).toISOString() : '';

  useEffect(() => {
    const c = new AbortController();
    getListing(id, c.signal).then(setListing).catch((e: Error) => e.name !== 'AbortError' && setError(e.message));
    return () => c.abort();
  }, [id]);

  // Price always comes from the server
  useEffect(() => {
    if (!fromIso || !toIso) return;
    const c = new AbortController();
    api<Quote>('/bookings/quote', { body: { listingId: id, from: fromIso, to: toIso, delivery, damageProtection: protection }, signal: c.signal })
      .then(setQuote)
      .catch((e: Error) => e.name !== 'AbortError' && setError(e.message));
    return () => c.abort();
  }, [id, fromIso, toIso, delivery, protection]);

  if (!fromIso || !toIso) {
    return (
      <main className="wrap">
        <div className="note w"><span>Choose pick-up and return times first. <Link href={`/listings/${id}`}>Back to the vehicle</Link></span></div>
      </main>
    );
  }
  if (!ready || !user || !listing || !quote) {
    return <main className="wrap mut">{error ? <div className="note r">{error}</div> : 'Loading…'}</main>;
  }

  const rent = listing.rent!;
  const tracked = listing.tracking.source !== 'none';
  const verified = user.kycStatus === 'verified' && user.licenceStatus === 'verified';
  const licenceOk = user.licenceClasses.includes(quote.licenceNeeded);
  const p = quote.price;
  const canPay = verified && licenceOk && quote.available && agreement && (!tracked || tracking) && !busy;
  const nextHere = `/book/${id}?${q.toString()}`;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const booking = await api<{ id: string }>('/bookings', {
        body: {
          listingId: id,
          from: fromIso,
          to: toIso,
          delivery,
          damageProtection: protection,
          trackingConsent: tracking,
          agreementAccepted: agreement,
          paymentMethod: method,
        },
      });
      router.push(`/trips?id=${booking.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Payment could not be completed. Nothing was charged.');
      setBusy(false);
    }
  }

  return (
    <main className="wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
      <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h1 style={{ fontSize: 32 }}>{quote.instantBook ? 'Book now' : 'Request to book'}</h1>

        <section className="card" aria-label="Trip" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="ph" style={{ width: 120, height: 84 }}>Photo</div>
          <div style={{ flex: '1 1 240px' }}>
            <strong>{listing.title} · {listing.vehicle.year}</strong>
            <div className="sm mut">{listing.seller.name} · {listing.area}</div>
            <div className="sm" style={{ marginTop: 4 }}>
              {fmt(fromIso)} → {fmt(toIso)} · {delivery ? 'delivered to you' : `pick-up at ${listing.area}`}
            </div>
          </div>
          <Link href={`/listings/${id}?from=${encodeURIComponent(fromLocal)}&to=${encodeURIComponent(toLocal)}`} className="sm">Edit</Link>
        </section>

        {!quote.available && (
          <div className="note r" role="alert"><span>This vehicle is already booked for part of these dates. <Link href={`/listings/${id}`}>Choose other times</Link></span></div>
        )}

        <section className="card" aria-labelledby="dr" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 id="dr" style={{ fontSize: 18 }}>Driver</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={`chip ${user.kycStatus === 'verified' ? 'ok' : 'er'}`}>
              {user.name ?? 'You'} · {user.kycStatus === 'verified' ? 'KYC verified' : 'KYC needed'}
            </span>
            <span className={`chip ${licenceOk ? 'ok' : 'er'}`}>
              {licenceOk ? `Licence ${quote.licenceNeeded} matches this vehicle` : `Needs a ${quote.licenceNeeded} licence`}
            </span>
          </div>
          {(!verified || !licenceOk) && (
            <div className="note w"><span>Finish verification to book. <Link href={`/verify?next=${encodeURIComponent(nextHere)}`}>Go to Verification →</Link></span></div>
          )}
        </section>

        {tracked && (
          <section className="card" aria-labelledby="tc" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, borderColor: '#1D5FD1' }}>
            <h2 id="tc" style={{ fontSize: 18 }}>Live tracking consent</h2>
            <p className="sm">
              This vehicle is tracked ({TRACKING_LABEL[listing.tracking.source]}). During your rental only, the operator can see its live location, speed and route
              {rent.allowedArea ? <>, and gets alerts for leaving <strong>{rent.allowedArea}</strong></> : null}
              {rent.speedLimitKmph ? <>, going over <strong>{rent.speedLimitKmph} km/h</strong></> : null} or returning late. Tracking stops when the rental ends. Data is stored in India.
            </p>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={tracking} onChange={(e) => setTracking(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--green)', marginTop: 2 }} />
              <span>I agree to live tracking during this rental <span className="chip er" style={{ marginLeft: 4 }}>Required</span></span>
            </label>
          </section>
        )}

        <section className="card" aria-labelledby="ag" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 id="ag" style={{ fontSize: 18 }}>Rental agreement</h2>
          <div className="sm" tabIndex={0} style={{ maxHeight: 170, overflow: 'auto', background: 'var(--ground)', border: '1px solid var(--line)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p><strong>1. Parties.</strong> {listing.seller.name} (licensed operator) and {user.name ?? 'the renter'}.</p>
            <p><strong>2. Vehicle.</strong> {listing.vehicle.make} {listing.vehicle.model}, {listing.vehicle.registrationMasked}, commercial registration.</p>
            <p><strong>3. Use.</strong> {rent.allowedArea ? `Within ${rent.allowedArea}; ` : ''}no racing, no carrying goods for hire; the rider must hold a valid {quote.licenceNeeded} licence.</p>
            <p><strong>4. Deposit.</strong> {inr(p.deposit)} held by GaadiWatch; deductions only for extra km, fuel, late return or damage shown against the pick-up checklist.</p>
            {quote.cancellation && <p><strong>5. Cancellation.</strong> {quote.cancellation.label}: {quote.cancellation.summary}.</p>}
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={agreement} onChange={(e) => setAgreement(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--green)', marginTop: 2 }} />
            <span>I accept the rental agreement. The operator accepts it when they approve your request.</span>
          </label>
        </section>

        {p.days > 0 && (
          <section className="card" aria-labelledby="dp" style={{ padding: 20, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 300px' }}>
              <h2 id="dp" style={{ fontSize: 18 }}>Damage protection <span className="chip">Optional</span></h2>
              <p className="sm mut" style={{ marginTop: 4 }}>Caps what you pay for accidental damage at {inr(quote.damageProtectionCap)}.</p>
            </div>
            <button type="button" className={`tog ${protection ? 'on' : ''}`} aria-label="Add damage protection" aria-pressed={protection} onClick={() => setProtection((v) => !v)} />
          </section>
        )}

        <section className="card" aria-labelledby="pm" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 id="pm" style={{ fontSize: 18 }}>Payment method</h2>
          {PAYMENT_METHODS.map((m) => (
            <label key={m.key} className="li" style={{ cursor: 'pointer', borderColor: method === m.key ? 'var(--green)' : undefined }}>
              <input type="radio" name="pm" checked={method === m.key} onChange={() => setMethod(m.key)} style={{ width: 18, height: 18, accentColor: 'var(--green)' }} />
              <span style={{ flex: 1 }}><strong>{m.label}</strong></span>
              {m.note && <span className="chip">{m.note}</span>}
            </label>
          ))}
        </section>
      </div>

      <aside style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <section className="card" aria-labelledby="sum" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 id="sum" style={{ fontSize: 20 }}>Price details</h2>
          <div className="sm" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row label={p.hourly ? `Rent · ${inr(rent.pricePerHour ?? 0)} × ${p.hours} h` : `Rent · ${inr(rent.pricePerDay)} × ${p.days} ${p.days === 1 ? 'day' : 'days'}`} value={inr(p.rent)} />
            {p.bookingFee > 0 && <Row label="Booking fee" value={inr(p.bookingFee)} />}
            {p.gstOnFees > 0 && <Row label="GST on fee" value={inr(p.gstOnFees)} />}
            {delivery && <Row label="Delivery" value={p.deliveryFee ? inr(p.deliveryFee) : 'Free'} />}
            <Row label="Damage protection" value={p.damageProtection ? inr(p.damageProtection) : 'Not added'} />
            <hr className="hr" />
            <Row label="Rental total" value={inr(p.rentalTotal)} strong />
            <Row label="Refundable deposit" value={inr(p.deposit)} strong />
            <hr className="hr" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700 }}><span>Total</span><span>{inr(p.totalNow)}</span></div>
          </div>
          {error && <div className="note r" role="alert">{error}</div>}
          <button type="button" className="btn bp" disabled={!canPay} onClick={() => void submit()} style={!canPay ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}>
            {busy ? 'Processing…' : quote.instantBook ? `Pay ${inr(p.totalNow)} & book` : `Pay ${inr(p.totalNow)} & send request`}
          </button>
          {!quote.instantBook && (
            <div className="note g sm" style={{ flexDirection: 'column', gap: 4 }}>
              <strong>Charged only if accepted</strong>
              <span>Your money is held by GaadiWatch. If the operator declines or doesn&apos;t reply within {quote.requestReplyHours} hours, it&apos;s released in full.</span>
            </div>
          )}
          <p className="xs mut">
            {p.freeKm !== null ? `${p.freeKm} km free for this trip${rent.extraKmCharge ? `, then ${inr(rent.extraKmCharge)}/km` : ''}. ` : ''}
            {rent.lateFeePerHour ? `Late return ${inr(rent.lateFeePerHour)}/hour. ` : ''}Extras are settled from the deposit at return.
          </p>
        </section>
      </aside>
    </main>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span>{label}</span>
      {strong ? <strong>{value}</strong> : <span>{value}</span>}
    </div>
  );
}
