'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api, errorMessage, useRequireAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { inr } from '@/lib/format';
import { FilePick } from '@/components/ui/FilePick';

type Deal = {
  id: string;
  stage: 'accepted' | 'met' | 'paid' | 'rc_transfer' | 'sold' | 'closed';
  stages: string[];
  price: number;
  finalPrice: number | null;
  soldAt: string | null;
  myRole: 'buyer' | 'seller';
  listing: { id: string; title: string; year: number; registration: string; photo: string | null };
  buyer: { name: string; phone: string };
  seller: { name: string; phone: string };
  inspection: { fee: number; bookedAt: string | null };
  saleSuccessFee: number;
  rcItems: { key: string; label: string; hint: string; upload: boolean; optional?: boolean; done?: boolean; na?: boolean; fileUrl?: string }[];
  rcDone: number;
  rcRequired: number;
  canMarkSold: boolean;
  myReview: { rating: number; comment: string | null } | null;
};

const STEP_LABELS: Record<string, string> = {
  accepted: 'Offer accepted',
  met: 'Meet & inspect',
  paid: 'Payment done',
  rc_transfer: 'Start RC transfer',
  sold: 'Seller marks sold',
  closed: 'Rate each other',
};

export function DealView() {
  const { user } = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const { data, error, setData } = useApi<Deal>(user ? `/deals/${id}` : null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (error && !data) return <main className="wrap"><div className="note r">{error}</div></main>;
  if (!data) return <main className="wrap mut">Loading…</main>;
  const d = data;
  const idx = d.stages.indexOf(d.stage);
  const other = d.myRole === 'buyer' ? d.seller : d.buyer;

  async function act(path: string, body?: unknown, method = 'POST') {
    setBusy(true);
    setErr(null);
    try {
      setData(await api<Deal>(path, { method, body }));
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {d.listing.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.listing.photo} alt="" style={{ width: 120, height: 84, objectFit: 'cover', borderRadius: 10 }} />
        ) : (
          <div className="ph" style={{ width: 120, height: 84 }}>Photo</div>
        )}
        <div style={{ flex: '1 1 300px' }}>
          <span className="chip ok">Offer accepted · {inr(d.price)}</span>
          <h1 style={{ fontSize: 30, marginTop: 6 }}>{d.listing.title} · {d.listing.year} · {d.listing.registration}</h1>
          <p className="sm mut">
            Seller {d.seller.name} · Buyer {d.buyer.name} · {other.name}&apos;s number: <a href={`tel:${other.phone}`}>{other.phone}</a>
          </p>
        </div>
      </div>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }} className="sm" aria-label="Sale progress">
        {d.stages.map((s, i) => {
          const done = i <= idx && !(s === 'closed' && d.stage !== 'closed');
          const current = i === idx + 1;
          return (
            <li key={s} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, borderColor: current ? 'var(--green)' : undefined, borderWidth: current ? 2 : undefined }}>
              <span className={`step ${done ? 'dn' : current ? 'on' : ''}`}>{done ? '✓' : i + 1}</span>
              {current ? <strong>{STEP_LABELS[s]}</strong> : STEP_LABELS[s]}
              {current && (s === 'met' || s === 'paid') && (
                <button type="button" className="btn bs" style={{ minHeight: 34 }} disabled={busy} onClick={() => void act(`/deals/${d.id}/stage`, { stage: s })}>Mark done</button>
              )}
            </li>
          );
        })}
      </ol>
      {err && <div className="note r" role="alert">{err}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <section className="card" style={{ flex: '999 1 560px', minWidth: 0, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }} aria-labelledby="rc">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h2 id="rc" style={{ fontSize: 22 }}>RC transfer checklist</h2>
            <span className={`chip ${d.rcDone >= d.rcRequired ? 'ok' : 'wa'}`}>{d.rcDone} of {d.rcRequired} done</span>
          </div>
          <p className="sm mut">Submit at the RTO or on Parivahan within 14 days of sale.</p>
          {d.rcItems.map((item) => {
            const isDone = item.done || item.na;
            return (
              <div key={item.key} className="li" style={{ borderColor: item.key === 'transfer_proof' && !item.done ? 'var(--green)' : undefined, flexWrap: 'wrap' }}>
                <input
                  type="checkbox"
                  aria-label={item.label}
                  checked={Boolean(isDone)}
                  disabled={busy || d.stage === 'sold' || d.stage === 'closed' || (item.upload && !item.fileUrl && !item.optional)}
                  onChange={(e) => void act(`/deals/${d.id}/rc-items/${item.key}`, { done: e.target.checked, fileUrl: item.fileUrl }, 'PUT')}
                  style={{ width: 18, height: 18, accentColor: 'var(--green)' }}
                />
                <div style={{ flex: '1 1 200px' }}>
                  <strong>{item.label}</strong>
                  {item.hint && <div className="xs mut">{item.hint}</div>}
                </div>
                {item.na ? (
                  <span className="chip">N/A</span>
                ) : item.fileUrl ? (
                  <a className="chip ok" href={item.fileUrl} target="_blank" rel="noreferrer">Uploaded</a>
                ) : item.upload && d.stage !== 'sold' && d.stage !== 'closed' ? (
                  <span style={{ display: 'flex', gap: 6 }}>
                    <FilePick label="Upload" accept="image/*,application/pdf" className={item.key === 'transfer_proof' ? 'btn bp' : 'btn bs'} style={{ minHeight: 36 }} onUploaded={(url) => void act(`/deals/${d.id}/rc-items/${item.key}`, { done: true, fileUrl: url }, 'PUT')} />
                    {item.optional && <button type="button" className="btn bt" style={{ minHeight: 36 }} onClick={() => void act(`/deals/${d.id}/rc-items/${item.key}`, { na: true, done: true }, 'PUT')}>Not needed</button>}
                  </span>
                ) : null}
              </div>
            );
          })}
          <Link href="/help" className="sm">Need help? Chat with us about RC transfer</Link>
        </section>

        <aside style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {d.myRole === 'buyer' && d.stage !== 'sold' && d.stage !== 'closed' && (
            <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }} aria-labelledby="ins">
              <span className="k">Optional · partner service</span>
              <h2 id="ins" style={{ fontSize: 18 }}>Inspection report</h2>
              <p className="sm mut">A certified mechanic checks the vehicle before you pay. Report in 24 hours.</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{inr(d.inspection.fee)}</strong>
                {d.inspection.bookedAt ? <span className="chip ok">Booked</span> : <button type="button" className="btn bs" disabled={busy} onClick={() => void act(`/deals/${d.id}/inspection`)}>Book inspection</button>}
              </div>
            </section>
          )}
          {d.myRole === 'seller' && d.stage !== 'sold' && d.stage !== 'closed' && <MarkSold deal={d} busy={busy} onSubmit={(price) => void act(`/deals/${d.id}/sold`, { finalPrice: price })} />}
          {(d.stage === 'sold' || d.stage === 'closed') && (
            <Rate deal={d} busy={busy} onSubmit={(rating, comment) => void act(`/deals/${d.id}/review`, { rating, comment })} />
          )}
        </aside>
      </div>
    </main>
  );
}

function MarkSold({ deal: d, busy, onSubmit }: { deal: Deal; busy: boolean; onSubmit: (price: number) => void }) {
  const [price, setPrice] = useState(String(d.price));
  return (
    <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }} aria-labelledby="ms">
      <h2 id="ms" style={{ fontSize: 18 }}>Mark as sold</h2>
      <p className="sm">The listing leaves search. You&apos;ll need the transfer request proof.</p>
      <div>
        <label className="lbl" htmlFor="sp">Final sale price (₹)</label>
        <input id="sp" className="in" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} />
      </div>
      <button type="button" className="btn bp" disabled={busy || !d.canMarkSold} onClick={() => onSubmit(Number(price))}>Mark as sold</button>
      {!d.canMarkSold && <p className="xs mut">Upload the proof of transfer request first.</p>}
      {d.saleSuccessFee > 0 && <p className="xs mut">A sale success fee of {inr(d.saleSuccessFee)} applies when sold through GaadiWatch.</p>}
    </section>
  );
}

function Rate({ deal: d, busy, onSubmit }: { deal: Deal; busy: boolean; onSubmit: (rating: number, comment: string) => void }) {
  const [rating, setRating] = useState(d.myReview?.rating ?? 0);
  const [comment, setComment] = useState(d.myReview?.comment ?? '');
  const who = d.myRole === 'buyer' ? d.seller.name : d.buyer.name;
  return (
    <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }} aria-labelledby="rt">
      <h2 id="rt" style={{ fontSize: 18 }}>Rate {who}</h2>
      <div role="radiogroup" aria-label="Rating" style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)} style={{ background: 'none', border: 0, fontSize: 26, color: '#B86E00', cursor: 'pointer', padding: 0 }}>
            {n <= rating ? '★' : '☆'}
          </button>
        ))}
      </div>
      <textarea className="in" rows={2} aria-label="Review" value={comment} onChange={(e) => setComment(e.target.value)} />
      <button type="button" className="btn bs" disabled={busy || !rating} onClick={() => onSubmit(rating, comment)}>{d.myReview ? 'Update rating' : 'Submit rating'}</button>
      {d.soldAt && <p className="xs mut">Sold for {inr(d.finalPrice ?? d.price)} on {new Date(d.soldAt).toLocaleDateString('en-IN')}.</p>}
    </section>
  );
}
