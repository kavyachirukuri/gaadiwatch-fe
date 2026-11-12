'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/auth';
import { inr } from '@/lib/format';
import { fmtDateTime, STATUS_LABEL, timeLeft, type Booking } from '@/lib/bookings-api';

const DECLINE_REASONS = ['Vehicle not available', 'Under maintenance', 'Renter does not meet requirements', 'Other'];

export function RequestCard({ booking: b, onChange }: { booking: Booking; onChange: () => Promise<void> }) {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState(DECLINE_REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cls, label] = STATUS_LABEL[b.status];
  const r = b.renter;

  async function act(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      await api(path, { method: 'POST', body });
      await onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <article className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }} aria-label={`Booking ${b.code}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <strong>{r?.name ?? 'Renter'}</strong> · <span className="sm">{b.listing.title} ({b.listing.registration})</span>
          <div className="sm">{fmtDateTime(b.startAt)} → {fmtDateTime(b.endAt)}{b.delivery ? ' · delivery requested' : ''}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span className={`chip ${cls}`}>{label}</span>
          <strong>{inr(b.price.rent + b.price.deliveryFee)}</strong>
          <span className="xs mut">{b.code}</span>
        </div>
      </div>

      {r && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className={`chip ${r.kycVerified ? 'ok' : 'er'}`}>{r.kycVerified ? 'KYC verified' : 'KYC missing'}</span>
          <span className={`chip ${r.licenceVerified ? 'ok' : 'er'}`}>
            {r.licenceVerified ? `Licence ${r.licenceClasses.join(', ')}` : 'Licence not verified'}
          </span>
          {b.listing.trackingSource !== 'none' && <span className="chip tr">Tracking consent given</span>}
          {r.phone && <span className="chip">{r.phone}</span>}
        </div>
      )}

      {b.status === 'requested' && b.replyBy && <p className="xs mut">Reply within {timeLeft(b.replyBy, now)} or the request expires and the renter&apos;s money is released.</p>}

      {error && <div className="note r" role="alert">{error}</div>}

      {b.status === 'requested' && !declining && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn bp" disabled={busy} onClick={() => void act(`/operator/bookings/${b.id}/accept`)}>
            {busy ? 'Saving…' : 'Accept'}
          </button>
          <button type="button" className="btn bt" disabled={busy} onClick={() => setDeclining(true)}>Decline</button>
        </div>
      )}

      {['accepted', 'paid', 'active', 'returned'].includes(b.status) && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn bp" href={`/trips/${b.id}/checklist`}>{b.status === 'active' || b.status === 'returned' ? 'Return checklist' : 'Pick-up checklist'}</Link>
          <button type="button" className="btn bs" onClick={() => void api<{ id: string }>('/conversations', { body: { bookingId: b.id } }).then((r) => router.push(`/messages?c=${r.id}`))}>Message renter</button>
        </div>
      )}

      {declining && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label className="lbl" htmlFor={`dr-${b.id}`}>Reason</label>
            <select id={`dr-${b.id}`} className="in" value={reason} onChange={(e) => setReason(e.target.value)}>
              {DECLINE_REASONS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <button type="button" className="btn bp" disabled={busy} style={{ background: '#B42318' }} onClick={() => void act(`/operator/bookings/${b.id}/decline`, { reason })}>
            {busy ? 'Saving…' : 'Decline request'}
          </button>
          <button type="button" className="btn bt" onClick={() => setDeclining(false)}>Back</button>
        </div>
      )}
    </article>
  );
}
