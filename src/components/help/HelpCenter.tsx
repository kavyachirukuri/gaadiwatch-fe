'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, errorMessage, useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { useMeta } from '@/lib/use-meta';
import { inr } from '@/lib/format';
import { FilePick, Thumb } from '@/components/ui/FilePick';

type DisputeRow = { id: string; code: string; typeLabel: string; status: string; bookingCode: string; title: string; amountHeld: number; createdAt: string; raisedByMe: boolean };
type DisputeDetail = {
  id: string;
  code: string;
  typeLabel: string;
  status: 'open' | 'responded' | 'reviewing' | 'resolved';
  description: string;
  raisedBy: string;
  raisedByMe: boolean;
  reply: string | null;
  repliedAt: string | null;
  decision: string | null;
  decisionReason: string | null;
  amountHeld: number;
  amountKept: number | null;
  createdAt: string;
  dueBy: string | null;
  resolvedAt: string | null;
  booking: { code: string; title: string; deposit: number; depositRefund: number | null };
  evidence: { label: string; url: string; phase: string }[];
};

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export function HelpCenter() {
  const { user } = useAuth();
  const { meta } = useMeta();
  const [query, setQuery] = useState('');
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const topics = (meta?.helpTopics ?? []).filter((t) => !query || `${t.title} ${t.body}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <main className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 32 }}>Help &amp; safety</h1>
          <p className="mut">We&apos;re here 24×7, especially while you&apos;re on a trip.</p>
        </div>
        <input className="in" style={{ maxWidth: 420 }} aria-label="Search help" placeholder="Search help, e.g. deposit" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <SosCard />
        <SupportCard />
        <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }} aria-labelledby="fq">
          <h2 id="fq" style={{ fontSize: 20 }}>Popular topics</h2>
          {topics.length === 0 && <p className="sm mut">No topics match.</p>}
          {topics.map((t) => (
            <div key={t.slug}>
              <button type="button" className="sm" onClick={() => setOpenTopic(openTopic === t.slug ? null : t.slug)} aria-expanded={openTopic === t.slug} style={{ background: 'none', border: 0, padding: 0, color: 'var(--green)', textAlign: 'left', cursor: 'pointer', fontWeight: 600 }}>
                {t.title}
              </button>
              {openTopic === t.slug && <p className="sm" style={{ marginTop: 6 }}>{t.body}</p>}
            </div>
          ))}
        </section>
      </div>

      {user ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
          <Disputes />
          <ReportForm />
        </div>
      ) : (
        <div className="note"><span><Link href="/login?next=/help">Log in</Link> to raise a dispute or report a listing.</span></div>
      )}
    </main>
  );
}

function SosCard() {
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; msg: string | null; err: string | null }>({ busy: false, msg: null, err: null });

  async function send() {
    if (!user) return router.push('/login?next=/help');
    if (!window.confirm('Send SOS to the GaadiWatch safety team now?')) return;
    setState({ busy: true, msg: null, err: null });
    const pos = await new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 8000 });
    });
    try {
      const r = await api<{ message: string }>('/sos', { body: pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : {} });
      setState({ busy: false, msg: r.message, err: null });
    } catch (e) {
      setState({ busy: false, msg: null, err: errorMessage(e) });
    }
  }

  return (
    <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, background: '#FDECEA', borderColor: '#F2C3BE' }} aria-labelledby="sos">
      <h2 id="sos" style={{ fontSize: 20, color: '#8A1910' }}>SOS during a trip</h2>
      <p className="sm">Accident, breakdown or feeling unsafe. We share your location with our team and call you within a minute.</p>
      <button type="button" className="btn bd" disabled={state.busy} onClick={() => void send()}>{state.busy ? 'Sending…' : 'Send SOS'}</button>
      {state.msg && <div className="note g sm" role="status">{state.msg}</div>}
      {state.err && <div className="note r sm" role="alert">{state.err}</div>}
      <span className="xs">Emergency? Call <a href="tel:112">112</a> first.</span>
    </section>
  );
}

function SupportCard() {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function start() {
    if (!user) return router.push('/login?next=/help');
    setBusy(true);
    try {
      const { id } = await api<{ id: string }>('/conversations', { body: { support: true } });
      router.push(`/messages?c=${id}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }} aria-labelledby="ch">
      <h2 id="ch" style={{ fontSize: 20 }}>24×7 help chat</h2>
      <p className="sm mut">Chat with our support team. Usually a reply within minutes.</p>
      <button type="button" className="btn bp" disabled={busy} onClick={() => void start()}>Start chat</button>
    </section>
  );
}

function Disputes() {
  const { meta } = useMeta();
  const q = useSearchParams();
  const bookings = useApi<{ id: string; code: string; title: string; startAt: string; endAt: string }[]>('/disputes/bookings');
  const mine = useApi<DisputeRow[]>('/disputes/mine');
  const [bookingId, setBookingId] = useState(q.get('booking') ?? '');
  const [type, setType] = useState('deposit_deduction');
  const [desc, setDesc] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const chosen = bookingId || bookings.data?.[0]?.id || '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const d = await api<DisputeDetail>('/disputes', { body: { bookingId: chosen, type, description: desc, photos } });
      setDesc('');
      setPhotos([]);
      setOpenId(d.id);
      mine.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ flex: '999 1 560px', minWidth: 0, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }} aria-labelledby="dp">
      <h2 id="dp" style={{ fontSize: 22 }}>Raise a dispute</h2>
      {bookings.data?.length === 0 ? (
        <p className="sm mut">Disputes can be raised about trips that have started. You have none yet.</p>
      ) : (
        <form onSubmit={(e) => void submit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div>
              <label className="lbl" htmlFor="bk">Booking</label>
              <select id="bk" className="in" value={chosen} onChange={(e) => setBookingId(e.target.value)}>
                {(bookings.data ?? []).map((b) => <option key={b.id} value={b.id}>#{b.code} · {b.title} · {day(b.startAt)}–{day(b.endAt)}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl" htmlFor="ty">What&apos;s it about?</label>
              <select id="ty" className="in" value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(meta?.disputeTypes ?? {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="lbl" htmlFor="ds">Tell us what happened</label>
            <textarea id="ds" className="in" rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} required minLength={10} />
          </div>
          <div>
            <span className="lbl">Photos (the hand-over checklist photos are attached automatically)</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
              {photos.map((u) => <Thumb key={u} url={u} height={84} onRemove={() => setPhotos((xs) => xs.filter((x) => x !== u))} />)}
              <FilePick label="+ Add photos" className="card" style={{ height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', color: 'var(--green)', font: '600 13px var(--font-body)', width: '100%' }} onUploaded={(u) => setPhotos((xs) => [...xs, u])} />
            </div>
          </div>
          {error && <div className="note r" role="alert">{error}</div>}
          <button type="submit" className="btn bp" disabled={busy || !chosen} style={{ alignSelf: 'flex-start' }}>{busy ? 'Submitting…' : 'Submit dispute'}</button>
        </form>
      )}

      {(mine.data?.length ?? 0) > 0 && (
        <>
          <hr className="hr" />
          <h3 style={{ fontSize: 18 }}>Your disputes</h3>
          {mine.data!.map((d) => (
            <div key={d.id} className="li" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <button type="button" onClick={() => setOpenId(openId === d.id ? null : d.id)} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span><strong>#{d.code} · {d.typeLabel}</strong> <span className="sm mut">· {d.title} · #{d.bookingCode}</span></span>
                <span className={`chip ${d.status === 'resolved' ? 'ok' : 'wa'}`}>{d.status}</span>
              </button>
              {openId === d.id && <DisputeDetailView id={d.id} onChange={mine.reload} />}
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function DisputeDetailView({ id, onChange }: { id: string; onChange: () => void }) {
  const { data, setData } = useApi<DisputeDetail>(`/disputes/${id}`);
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!data) return <p className="sm mut">Loading…</p>;
  const steps = [
    { label: 'Opened', done: true, when: day(data.createdAt) },
    { label: 'Other side replied', done: Boolean(data.repliedAt), when: data.repliedAt ? day(data.repliedAt) : 'Waiting' },
    { label: 'Support reviewing', done: data.status === 'resolved', when: data.dueBy ? `Decision by ${day(data.dueBy)}` : '' },
    { label: 'Decision', done: data.status === 'resolved', when: data.resolvedAt ? day(data.resolvedAt) : 'Refund or deduction' },
  ];
  const currentIdx = steps.findIndex((s) => !s.done);

  async function sendReply() {
    setError(null);
    try {
      setData(await api<DisputeDetail>(`/disputes/${id}/reply`, { body: { text: reply } }));
      setReply('');
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }} className="sm">
        {steps.map((s, i) => (
          <li key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className={`step ${s.done ? 'dn' : i === currentIdx ? 'on' : ''}`}>{s.done ? '✓' : i + 1}</span>
            {i === currentIdx ? <strong>{s.label}</strong> : s.label}
            <span className="xs mut">{s.when}</span>
          </li>
        ))}
      </ol>
      <p className="sm"><strong>{data.raisedByMe ? 'You' : data.raisedBy}:</strong> {data.description}</p>
      {data.reply && <p className="sm"><strong>{data.raisedByMe ? 'Other side' : 'You'}:</strong> {data.reply}</p>}
      {data.amountHeld > 0 && data.status !== 'resolved' && <div className="note sm">{inr(data.amountHeld)} is on hold until a decision.</div>}
      {data.status === 'resolved' && (
        <div className="note g sm">Decision: {data.decisionReason}{data.amountKept ? ` · ${inr(data.amountKept)} kept for the owner` : ''}</div>
      )}
      {data.evidence.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
          {data.evidence.map((p) => <Thumb key={p.url} url={p.url} label={`${p.phase === 'pickup' ? 'Pick-up' : 'Return'} · ${p.label}`} height={70} />)}
        </div>
      )}
      {!data.raisedByMe && !data.reply && data.status !== 'resolved' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="in" style={{ flex: '1 1 240px' }} aria-label="Your side" placeholder="Add your side of the story" value={reply} onChange={(e) => setReply(e.target.value)} />
          <button type="button" className="btn bp" disabled={reply.length < 5} onClick={() => void sendReply()}>Send reply</button>
        </div>
      )}
      {error && <div className="note r sm">{error}</div>}
    </div>
  );
}

function ReportForm() {
  const { meta } = useMeta();
  const q = useSearchParams();
  const listingId = q.get('listing');
  const userId = q.get('user');
  const what = q.get('what') ?? '';
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [state, setState] = useState<{ msg: string | null; err: string | null; busy: boolean }>({ msg: null, err: null, busy: false });
  const reasons = meta?.reportReasons ?? [];
  const chosen = reason || reasons[0] || '';

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState({ msg: null, err: null, busy: true });
    try {
      const r = await api<{ message: string }>('/reports', { body: { listingId: listingId ?? undefined, userId: userId ?? undefined, reason: chosen, details: details || undefined } });
      setState({ msg: r.message, err: null, busy: false });
      setDetails('');
    } catch (err) {
      setState({ msg: null, err: errorMessage(err), busy: false });
    }
  }

  return (
    <section className="card" style={{ flex: '1 1 340px', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }} aria-labelledby="rp">
      <h2 id="rp" style={{ fontSize: 22 }}>Report a listing or user</h2>
      {!listingId && !userId ? (
        <p className="sm mut">Open the listing or chat you want to report and use its &quot;Report&quot; link — it brings you here with the details filled in.</p>
      ) : (
        <form onSubmit={(e) => void send(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <span className="lbl">Who or what</span>
            <div className="in" style={{ display: 'flex', alignItems: 'center' }}>{what || (listingId ? 'This listing' : 'This user')}</div>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <legend className="lbl">Reason</legend>
            {reasons.map((r) => (
              <label key={r} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="reason" checked={chosen === r} onChange={() => setReason(r)} style={{ accentColor: 'var(--green)' }} />
                {r}
              </label>
            ))}
          </fieldset>
          <div>
            <label className="lbl" htmlFor="mo">More details (optional)</label>
            <textarea id="mo" className="in" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
          {state.msg && <div className="note g sm" role="status">{state.msg}</div>}
          {state.err && <div className="note r sm" role="alert">{state.err}</div>}
          <button type="submit" className="btn bp" disabled={state.busy}>Send report</button>
        </form>
      )}
      <p className="xs mut">Reports are confidential. Our grievance officer{meta?.grievanceEmail ? ` (${meta.grievanceEmail})` : ''} responds within 24 hours as required under IT rules.</p>
    </section>
  );
}
