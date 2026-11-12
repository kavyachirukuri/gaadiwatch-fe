'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, errorMessage, useRequireAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { inr, inrShort } from '@/lib/format';
import { fuelLabel } from '@/lib/listings-api';

type ConvRow = {
  id: string;
  kind: 'sale' | 'rental' | 'support';
  myRole: 'buyer' | 'seller';
  otherName: string;
  listingTitle: string | null;
  photo: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unread: number;
};
type Thread = {
  id: string;
  kind: 'sale' | 'rental' | 'support';
  myRole: 'buyer' | 'seller';
  iShared: boolean;
  dealId: string | null;
  other: { id: string | null; name: string; kycVerified: boolean; replyMinutes: number | null; phone: string | null };
  listing: null | {
    id: string;
    title: string;
    year: number;
    fuel: string;
    odometerKm: number | null;
    ownerCount: number;
    salePrice: number | null;
    pricePerDay: number | null;
    purpose: string;
    status: string;
    photo: string | null;
  };
  messages: {
    id: string;
    kind: 'text' | 'offer' | 'test_ride' | 'system';
    mine: boolean;
    fromSupport: boolean;
    body: string | null;
    createdAt: string;
    offer?: { id: string; amount: number; status: string; fromSeller: boolean; expiresAt: string | null; canAnswer: boolean };
    testRide?: { id: string; at: string; place: string; status: string; canConfirm: boolean };
  }[];
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'buying', label: 'Buying' },
  { key: 'selling', label: 'Selling' },
  { key: 'rentals', label: 'Rentals' },
] as const;

function ago(iso: string, now: number) {
  const m = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 24 * 60) return `${Math.round(m / 60)}h`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function MessagesView() {
  const { user } = useRequireAuth();
  const router = useRouter();
  const q = useSearchParams();
  const selected = q.get('c');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>(() => FILTERS.find((f) => f.key === q.get('filter'))?.key ?? 'all');
  const list = useApi<ConvRow[]>(user ? `/conversations?filter=${filter}` : null, { pollMs: 15_000 });
  const [now] = useState(() => Date.now());

  if (!user) return <main className="wrap mut">Loading…</main>;

  return (
    <main className="wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 0, paddingTop: 24 }}>
      <aside className="card" style={{ flex: '1 1 280px', maxWidth: selected ? 340 : undefined, borderRadius: selected ? '14px 0 0 14px' : 14, display: 'flex', flexDirection: 'column' }} aria-label="Conversations">
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--line)' }}>
          <h1 style={{ fontSize: 22 }}>Messages</h1>
          <div className="seg" style={{ flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <button key={f.key} type="button" className={filter === f.key ? 'on' : ''} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
            ))}
          </div>
        </div>
        {list.data === null ? (
          <p className="mut" style={{ padding: 16 }}>Loading…</p>
        ) : list.data.length === 0 ? (
          <p className="mut sm" style={{ padding: 16 }}>No conversations yet. Message a seller or operator from a listing.</p>
        ) : (
          list.data.map((c) => (
            <Link
              key={c.id}
              href={`/messages?c=${c.id}`}
              style={{ display: 'flex', gap: 12, padding: '14px 16px', textDecoration: 'none', color: 'var(--ink)', borderTop: '1px solid #EEEBE4', background: c.id === selected ? 'var(--green-tint)' : undefined }}
            >
              {c.kind === 'support' ? (
                <div className="av" style={{ width: 48, height: 48, background: 'var(--ink)' }}>GW</div>
              ) : c.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.photo} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flex: 'none' }} />
              ) : (
                <div className="ph" style={{ width: 48, height: 48, flex: 'none' }}>{c.listingTitle?.slice(0, 3) ?? '—'}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                  <strong>
                    {c.kind === 'support' ? 'GaadiWatch Support' : c.otherName}
                    {c.kind === 'sale' && c.myRole === 'seller' && <span className="chip" style={{ marginLeft: 4 }}>Buyer</span>}
                  </strong>
                  <span className="xs mut">{ago(c.lastMessageAt, now)}</span>
                </div>
                <div className="sm mut" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.listingTitle ? `${c.listingTitle} · ` : ''}{c.lastMessage ?? ''}
                </div>
              </div>
              {c.unread > 0 && <span className="chip ok" aria-label={`${c.unread} unread`}>{c.unread}</span>}
            </Link>
          ))
        )}
      </aside>
      {selected && <ThreadView key={selected} id={selected} onChange={list.reload} onClose={() => router.push('/messages')} />}
    </main>
  );
}

function ThreadView({ id, onChange, onClose }: { id: string; onChange: () => void; onClose: () => void }) {
  const q = useSearchParams();
  const { data, error, setData } = useApi<Thread>(`/conversations/${id}`, { pollMs: 5_000 });
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'offer' | 'ride' | null>(() => (q.get('action') === 'offer' ? 'offer' : q.get('action') === 'ride' ? 'ride' : null));
  const [amount, setAmount] = useState('');
  const [rideAt, setRideAt] = useState('');
  const [place, setPlace] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const count = data?.messages.length ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [count]);

  if (error && !data) return <section className="card" style={{ flex: '999 1 480px', padding: 24 }}><div className="note r">{error}</div></section>;
  if (!data) return <section className="card" style={{ flex: '999 1 480px', padding: 24 }}><p className="mut">Loading…</p></section>;

  async function act(fn: () => Promise<Thread | unknown>, reset?: () => void) {
    setBusy(true);
    setErr(null);
    try {
      const r = await fn();
      if (r && typeof r === 'object' && 'messages' in r) setData(r as Thread);
      else setData(await api<Thread>(`/conversations/${id}`));
      reset?.();
      onChange();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const l = data.listing;
  const isSale = data.kind === 'sale';
  return (
    <>
      <section className="card" style={{ flex: '999 1 480px', minWidth: 0, borderRadius: 0, display: 'flex', flexDirection: 'column', minHeight: 640 }} aria-label={`Conversation with ${data.other.name}`}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn bt" onClick={onClose} aria-label="Back to conversations" style={{ minHeight: 36, padding: '0 10px' }}>←</button>
          <div className="av">{data.other.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <strong>{data.other.name}</strong>
            <div className="xs mut">
              {data.other.kycVerified ? 'KYC verified' : 'Not verified'}
              {data.other.replyMinutes ? ` · replies in ~${data.other.replyMinutes} min` : ''}
              {l ? ` · ${l.title} ${l.year}${l.salePrice ? ` · ${inrShort(l.salePrice)}` : ''}` : ''}
            </div>
          </div>
          {data.kind !== 'support' &&
            (data.other.phone ? (
              <a className="chip ok" href={`tel:${data.other.phone}`}>{data.other.phone}</a>
            ) : (
              <>
                <span className="chip">Phone hidden</span>
                {!data.iShared && <button type="button" className="btn bs" style={{ minHeight: 40 }} disabled={busy} onClick={() => void act(() => api(`/conversations/${id}/share-number`, { method: 'POST' }))}>Share my number</button>}
              </>
            ))}
        </div>

        <div style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--ground)', overflowY: 'auto', maxHeight: 620 }}>
          {data.messages.map((m) => {
            if (m.kind === 'system') return <div key={m.id} className="note sm" style={{ alignSelf: 'center', maxWidth: 520 }}>{m.body}</div>;
            if (m.offer) {
              const o = m.offer;
              const label = o.fromSeller ? (m.mine ? 'Your counter offer' : 'Counter offer from seller') : m.mine ? 'Your offer' : 'Offer from buyer';
              return (
                <div key={m.id} className="card" style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340, borderColor: o.canAnswer ? 'var(--green)' : undefined, borderWidth: o.canAnswer ? 2 : undefined }}>
                  <span className="k">{label}</span>
                  <strong style={{ fontSize: 22 }}>{inr(o.amount)}</strong>
                  {o.status === 'pending' && o.expiresAt && <span className="sm mut">Valid until {new Date(o.expiresAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>}
                  {o.status !== 'pending' && <span className={`chip ${o.status === 'accepted' ? 'ok' : 'er'}`} style={{ alignSelf: 'flex-start' }}>{o.status[0].toUpperCase() + o.status.slice(1)}</span>}
                  {o.canAnswer && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="btn bp" disabled={busy} onClick={() => void act(() => api(`/offers/${o.id}/accept`, { method: 'POST' }))}>Accept</button>
                      <button type="button" className="btn bs" disabled={busy} onClick={() => setMode('offer')}>Counter</button>
                      <button type="button" className="btn bt" disabled={busy} onClick={() => void act(() => api(`/offers/${o.id}/decline`, { method: 'POST' }))}>Decline</button>
                    </div>
                  )}
                </div>
              );
            }
            if (m.testRide) {
              const r = m.testRide;
              return (
                <div key={m.id} className="card" style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', padding: 14, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320, borderColor: '#1D5FD1' }}>
                  <span className="k">Test ride</span>
                  <strong>{new Date(r.at).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</strong>
                  <span className="sm mut">{r.place} · bring your driving licence</span>
                  <span className={`chip ${r.status === 'confirmed' ? 'ok' : r.status === 'cancelled' ? 'er' : 'wa'}`} style={{ alignSelf: 'flex-start' }}>
                    {r.status === 'confirmed' ? 'Confirmed by both' : r.status === 'cancelled' ? 'Cancelled' : 'Waiting for confirmation'}
                  </span>
                  {r.canConfirm && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn bp" disabled={busy} onClick={() => void act(() => api(`/test-rides/${r.id}/confirm`, { method: 'POST' }))}>Confirm</button>
                      <button type="button" className="btn bt" disabled={busy} onClick={() => void act(() => api(`/test-rides/${r.id}/cancel`, { method: 'POST' }))}>Can&apos;t make it</button>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div key={m.id} className={`bub ${m.mine ? 'me' : 'th'}`}>
                {m.fromSupport && !m.mine && <div className="xs" style={{ fontWeight: 700 }}>GaadiWatch Support</div>}
                {m.body}
              </div>
            );
          })}
          {data.dealId && (
            <Link href={`/deals/${data.dealId}`} className="btn bp" style={{ alignSelf: 'center' }}>Go to the sale steps →</Link>
          )}
          <div ref={endRef} />
        </div>

        {err && <div className="note r sm" style={{ margin: '0 18px' }} role="alert">{err}</div>}
        {mode === 'offer' && (
          <form onSubmit={(e) => { e.preventDefault(); void act(() => api(`/conversations/${id}/offers`, { body: { amount: Number(amount) } }), () => { setMode(null); setAmount(''); }); }} style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label className="lbl" htmlFor="am">{data.myRole === 'seller' ? 'Counter offer (₹)' : 'Your offer (₹)'}</label>
              <input id="am" className="in" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder={l?.salePrice ? String(l.salePrice) : ''} autoFocus />
            </div>
            <button type="submit" className="btn bp" disabled={busy || !amount}>Send offer</button>
            <button type="button" className="btn bt" onClick={() => setMode(null)}>Cancel</button>
          </form>
        )}
        {mode === 'ride' && (
          <form onSubmit={(e) => { e.preventDefault(); void act(() => api(`/conversations/${id}/test-rides`, { body: { at: new Date(rideAt).toISOString(), place } }), () => { setMode(null); setPlace(''); }); }} style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label className="lbl" htmlFor="ra">When</label>
              <input id="ra" type="datetime-local" className="in" value={rideAt} onChange={(e) => setRideAt(e.target.value)} required />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label className="lbl" htmlFor="rp">Where (a public place)</label>
              <input id="rp" className="in" value={place} onChange={(e) => setPlace(e.target.value)} required />
            </div>
            <button type="submit" className="btn bp" disabled={busy}>Propose</button>
            <button type="button" className="btn bt" onClick={() => setMode(null)}>Cancel</button>
          </form>
        )}
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) void act(() => api(`/conversations/${id}/messages`, { body: { body: text } }), () => setText('')); }} style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {isSale && l?.status === 'live' && !data.dealId && (
            <>
              <button type="button" className="btn bs" style={{ minHeight: 40 }} onClick={() => setMode('offer')}>Make offer</button>
              <button type="button" className="btn bs" style={{ minHeight: 40 }} onClick={() => setMode('ride')}>Book test ride</button>
            </>
          )}
          <input className="in" style={{ flex: '1 1 240px' }} aria-label="Message" placeholder="Write a message" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="btn bp" disabled={busy || !text.trim()}>Send</button>
        </form>
      </section>

      {l && (
        <aside className="card" style={{ flex: '1 1 260px', maxWidth: 320, borderRadius: '0 14px 14px 0', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Listing">
          {l.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.photo} alt={l.title} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10 }} />
          ) : (
            <div className="ph" style={{ height: 140 }}>Photo</div>
          )}
          <strong>{l.title} · {l.year}</strong>
          <div className="sm mut">
            {fuelLabel(l.fuel)}
            {l.odometerKm !== null ? ` · ${l.odometerKm.toLocaleString('en-IN')} km` : ''} · {l.ownerCount === 1 ? '1st' : `${l.ownerCount}nd`} owner
          </div>
          {l.salePrice && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="sm">Asking</span><strong>{inrShort(l.salePrice)}</strong></div>}
          {l.pricePerDay && !l.salePrice && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="sm">Per day</span><strong>{inr(l.pricePerDay)}</strong></div>}
          <Link className="btn bs" href={`/listings/${l.id}`}>View listing</Link>
          {isSale && (
            <>
              <hr className="hr" />
              <span className="k">Safety tips</span>
              <ul className="sm" style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>Meet in a public place in daylight</li>
                <li>Check the RC and chassis number match</li>
                <li>Pay only after you&apos;ve seen the vehicle</li>
              </ul>
            </>
          )}
          {data.other.id && (
            <Link href={`/help?user=${data.other.id}&what=${encodeURIComponent(`User · ${data.other.name}`)}`} className="sm" style={{ color: '#9B1C13' }}>Report this user</Link>
          )}
        </aside>
      )}
    </>
  );
}
