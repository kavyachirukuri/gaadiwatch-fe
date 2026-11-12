'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError, useRequireAuth } from '@/lib/auth';
import { inr } from '@/lib/format';
import { fmtDateTime, STATUS_LABEL, timeLeft, type Booking, type CancelPreview } from '@/lib/bookings-api';

const TABS = [
  { key: 'upcoming', label: 'Upcoming', match: ['requested', 'accepted', 'paid', 'active'] },
  { key: 'past', label: 'Past', match: ['returned', 'completed', 'disputed'] },
  { key: 'cancelled', label: 'Cancelled', match: ['cancelled', 'declined'] },
] as const;

export function TripsView() {
  const { user, ready } = useRequireAuth();
  const router = useRouter();
  const selectedId = useSearchParams().get('id');
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('upcoming');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBookings(await api<Booking[]>('/bookings/mine'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your trips');
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let live = true;
    api<Booking[]>('/bookings/mine')
      .then((rows) => live && setBookings(rows))
      .catch((e: unknown) => live && setError(e instanceof ApiError ? e.message : 'Could not load your trips'));
    return () => { live = false; };
  }, [user]);

  if (!ready || !user) return <main className="wrap mut">Loading…</main>;

  const selected = bookings?.find((b) => b.id === selectedId) ?? null;
  const shown = (bookings ?? []).filter((b) => (TABS.find((t) => t.key === tab)!.match as readonly string[]).includes(b.status));

  return (
    <main className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 32 }}>My trips</h1>
        <Link className="btn bs" href="/rent">Rent a vehicle</Link>
      </div>

      {error && <div className="note r" role="alert">{error}</div>}

      {selected && <TripDetail booking={selected} onChange={load} onClose={() => router.replace('/trips')} />}

      <div className="seg" role="tablist" aria-label="Trips">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {bookings === null ? (
        <p className="mut">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <p className="mut">No {tab} trips.</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shown.map((b) => {
            const [cls, label] = STATUS_LABEL[b.status];
            return (
              <li key={b.id}>
                <Link href={`/trips?id=${b.id}`} className="li" style={{ textDecoration: 'none', color: 'inherit', flexWrap: 'wrap', borderColor: b.id === selectedId ? 'var(--green)' : undefined }}>
                  <div className="ph" style={{ width: 88, height: 64 }}>Photo</div>
                  <div style={{ flex: '1 1 220px' }}>
                    <strong>{b.listing.title} · {b.listing.year}</strong>
                    <div className="sm mut">{b.operator.name} · {b.listing.area}</div>
                    <div className="sm">{fmtDateTime(b.startAt)} → {fmtDateTime(b.endAt)}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span className={`chip ${cls}`}>{label}</span>
                    <span className="sm"><strong>{inr(b.price.rentalTotal)}</strong></span>
                    <span className="xs mut">{b.code}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function TripDetail({ booking: b, onChange, onClose }: { booking: Booking; onChange: () => Promise<void>; onClose: () => void }) {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [preview, setPreview] = useState<CancelPreview | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cls, label] = STATUS_LABEL[b.status];
  const cancellable = ['requested', 'accepted', 'paid'].includes(b.status);

  async function messageOperator() {
    try {
      const r = await api<{ id: string }>('/conversations', { body: { bookingId: b.id } });
      router.push(`/messages?c=${r.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not open the chat');
    }
  }

  async function openCancel() {
    setError(null);
    try {
      setPreview(await api<CancelPreview>(`/bookings/${b.id}/cancel-preview`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not check the refund');
    }
  }

  async function confirmCancel() {
    setBusy(true);
    setError(null);
    try {
      await api(`/bookings/${b.id}/cancel`, { body: { reason: reason || 'Plans changed' } });
      setPreview(null);
      await onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not cancel');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-label={`Trip ${b.code}`} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16, borderColor: 'var(--green)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 22 }}>{b.listing.title} · {b.listing.year}</h2>
            <span className={`chip ${cls}`}>{label}</span>
          </div>
          <p className="sm mut">Booking {b.code} · {b.listing.registration}</p>
        </div>
        <button type="button" className="btn bt" onClick={onClose}>Close</button>
      </div>

      {b.status === 'requested' && b.replyBy && (
        <div className="note w"><span>Sent to {b.operator.name}. They have {timeLeft(b.replyBy, now)} to reply; if they don&apos;t, your hold of {inr(b.price.rentalTotal + b.price.deposit)} is released in full.</span></div>
      )}
      {(b.status === 'accepted' || b.status === 'paid') && (
        <div className="note g"><span>Confirmed. {b.delivery ? 'The vehicle will be delivered to you' : `Pick up at ${b.listing.area}`} on {fmtDateTime(b.startAt)}. Do the pick-up checklist with the operator before you ride.</span></div>
      )}
      {b.status === 'declined' && (
        <div className="note r"><span>{b.operator.name} declined{b.declineReason ? `: ${b.declineReason}` : ''}. Nothing was charged.</span></div>
      )}
      {b.status === 'cancelled' && (
        <div className="note r"><span>Cancelled{b.cancelReason ? ` (${b.cancelReason})` : ''}. Refund: {inr(b.refundAmount ?? 0)}.</span></div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="sm" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <strong>When</strong>
          <span>{fmtDateTime(b.startAt)}</span>
          <span>→ {fmtDateTime(b.endAt)}</span>
          {b.listing.lateGraceMinutes ? <span className="mut">{b.listing.lateGraceMinutes} min grace on return</span> : null}
        </div>
        <div className="sm" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <strong>Operator</strong>
          <span>{b.operator.name}</span>
          <span className="mut">{b.operator.phone ?? 'Phone shown once confirmed'}</span>
        </div>
        <div className="sm" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <strong>Paid</strong>
          <span>Rental {inr(b.price.rentalTotal)}</span>
          <span>Deposit {inr(b.price.deposit)} (refundable)</span>
          <span className="mut">Payment: {b.paymentStatus.replace('_', ' ')}</span>
        </div>
      </div>

      {error && <div className="note r" role="alert">{error}</div>}

      {b.status === 'completed' && b.settlement.depositRefund !== null && (
        <div className="note g sm">
          <span>
            Deposit settled: {inr(b.settlement.depositRefund)} refunded
            {b.settlement.extraKmFee ? ` · extra km ${inr(b.settlement.extraKmFee)}` : ''}
            {b.settlement.fuelFee ? ` · fuel ${inr(b.settlement.fuelFee)}` : ''}
            {b.settlement.lateFee ? ` · late return ${inr(b.settlement.lateFee)}` : ''}
            {b.settlement.damageKept ? ` · damage ${inr(b.settlement.damageKept)}` : ''}
            {b.settlement.kmDriven !== null ? ` · ${b.settlement.kmDriven} km driven` : ''}
          </span>
        </div>
      )}

      {b.status === 'active' && b.listing.trackingSource === 'phone' && <ShareLocation bookingId={b.id} />}

      {!preview && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['accepted', 'paid', 'active', 'returned'].includes(b.status) && <Link className="btn bp" href={`/trips/${b.id}/checklist`}>{b.status === 'active' || b.status === 'returned' ? 'Return checklist' : 'Pick-up checklist'}</Link>}
          <Link className="btn bs" href={`/listings/${b.listing.id}`}>View vehicle</Link>
          {!['declined', 'cancelled'].includes(b.status) && <button type="button" className="btn bs" onClick={() => void messageOperator()}>Message operator</button>}
          {['active', 'returned', 'completed', 'disputed'].includes(b.status) && <Link className="btn bt" href={`/help?booking=${b.id}`}>Raise a dispute</Link>}
          {b.status === 'completed' && <Link className="btn bt" href={`/invoices/${b.code}`}>Invoice</Link>}
          {cancellable && <button type="button" className="btn bt" onClick={() => void openCancel()}>Cancel booking</button>}
        </div>
      )}

      {preview && (
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--ground)' }}>
          <strong>Cancel this booking?</strong>
          <p className="sm">
            {preview.free
              ? `You get back the full ${inr(preview.refund)}.`
              : `You get back ${inr(preview.refund)}. ${inr(preview.kept)} is kept under the operator's cancellation policy.`}
          </p>
          <div>
            <label className="lbl" htmlFor="cr">Reason (optional)</label>
            <input id="cr" className="in" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Plans changed" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn bp" disabled={busy} onClick={() => void confirmCancel()} style={{ background: '#B42318' }}>
              {busy ? 'Cancelling…' : 'Yes, cancel'}
            </button>
            <button type="button" className="btn bt" onClick={() => setPreview(null)}>Keep booking</button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Phone-tracked trips: the renter's browser sends its location every 30 seconds while this page is open. */
function ShareLocation({ bookingId }: { bookingId: string }) {
  const [on, setOn] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!on || !navigator.geolocation) return;
    const send = (p: GeolocationPosition) =>
      void api('/tracking/phone', {
        body: { bookingId, lat: p.coords.latitude, lng: p.coords.longitude, speedKmph: p.coords.speed !== null ? p.coords.speed * 3.6 : undefined },
      })
        .then(() => setStatus(`Location shared at ${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`))
        .catch((e: unknown) => setStatus(e instanceof ApiError ? e.message : 'Could not share location'));
    const tick = () => navigator.geolocation.getCurrentPosition(send, () => setStatus('Allow location access in your browser'), { enableHighAccuracy: true, timeout: 10_000 });
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [on, bookingId]);

  return (
    <div className="note" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ flex: 1 }}>This vehicle is tracked by your phone. Keep this page open during the trip. {status}</span>
      <button type="button" className={`tog ${on ? 'on' : ''}`} aria-pressed={on} aria-label="Share my location" onClick={() => setOn((x) => !x)} />
    </div>
  );
}
