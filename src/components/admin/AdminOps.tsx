'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, errorMessage } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { inr } from '@/lib/format';
import { Thumb } from '@/components/ui/FilePick';
import { useStaff } from './AdminShell';

type DisputeRow = { id: string; code: string; typeLabel: string; status: string; amountHeld: number; bookingCode: string; title: string; slaHoursLeft: number | null };
type Dispute = {
  id: string;
  code: string;
  typeLabel: string;
  status: string;
  description: string;
  raisedBy: string;
  reply: string | null;
  amountHeld: number;
  booking: { code: string; title: string; deposit: number; renterName: string | null };
  owner: string | null;
  ownerRaised: boolean;
  renterRating: number | null;
  checklistNotes: { phase: string; notes: string | null; odometerKm: number | null; fuelLevel: string | null }[];
  evidence: { label: string; url: string; phase: string; at: string }[];
  decisionReason: string | null;
};
type UserRow = { id: string; name: string; phone: string; roles: string[]; verification: string; rating: number | null; reports: number; status: 'active' | 'watch' | 'banned'; statusReason: string | null };

const TABS = ['disputes', 'users', 'refunds', 'reports', 'sos', 'support'] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = { disputes: 'Disputes', users: 'Users', refunds: 'Refunds', reports: 'Reports', sos: 'SOS', support: 'Support chats' };

export function AdminOps() {
  const initial = useSearchParams().get('tab');
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS.includes(initial as never) ? (initial as (typeof TABS)[number]) : 'disputes');
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 30 }}>Disputes, users &amp; refunds</h1>
        <div className="seg" style={{ flexWrap: 'wrap' }}>
          {TABS.map((t) => <button key={t} type="button" className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{TAB_LABEL[t]}</button>)}
        </div>
      </div>
      {tab === 'disputes' && <Disputes />}
      {tab === 'users' && <Users />}
      {tab === 'refunds' && <Refunds />}
      {tab === 'reports' && <Reports />}
      {tab === 'sos' && <Sos />}
      {tab === 'support' && <Support />}
    </>
  );
}

function Disputes() {
  const list = useApi<DisputeRow[]>('/admin/disputes', { staff: true });
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = selected ?? list.data?.[0]?.id ?? null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
      <section className="card" style={{ flex: '1 1 260px', maxWidth: 340 }} aria-label="Open disputes">
        {list.data?.length === 0 && <p className="sm mut" style={{ padding: 16 }}>No open disputes.</p>}
        {list.data?.map((d) => (
          <button key={d.id} type="button" onClick={() => setSelected(d.id)} style={{ width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid #EEEBE4', padding: 14, background: chosen === d.id ? 'var(--green-tint)' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong>#{d.code} · {d.typeLabel} · {inr(d.amountHeld)}</strong>
            <span className="sm mut">#{d.bookingCode} · {d.title}</span>
            {d.slaHoursLeft !== null && <span className={`chip ${d.slaHoursLeft < 0 ? 'er' : d.slaHoursLeft < 12 ? 'wa' : ''}`} style={{ alignSelf: 'flex-start' }}>{d.slaHoursLeft < 0 ? `${-d.slaHoursLeft} h past SLA` : `SLA: ${d.slaHoursLeft} h left`}</span>}
          </button>
        ))}
      </section>
      {chosen && <DisputeCase key={chosen} id={chosen} onDone={list.reload} />}
    </div>
  );
}

function DisputeCase({ id, onDone }: { id: string; onDone: () => void }) {
  const { data, setData } = useApi<Dispute>(`/admin/disputes/${id}`, { staff: true });
  const [decision, setDecision] = useState<'refund_full' | 'partial' | 'keep'>('refund_full');
  const [kept, setKept] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!data) return <p className="mut">Loading…</p>;
  const resolved = data.status === 'resolved';
  const refund = decision === 'refund_full' ? data.amountHeld : decision === 'keep' ? 0 : Math.max(0, data.amountHeld - Number(kept || 0));

  async function run(path: string, body?: unknown) {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<Dispute | { ok: boolean }>(path, { body, method: 'POST', staff: true });
      if ('code' in r) setData(r);
      onDone();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ flex: '999 1 520px', minWidth: 0, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }} aria-label={`Dispute ${data.code}`}>
      <h2 style={{ fontSize: 22 }}>#{data.code} · {data.typeLabel} · {inr(data.amountHeld)}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }} className="sm">
        <div><div className="mut xs">Booking</div><strong>#{data.booking.code} · {data.booking.title}</strong></div>
        <div><div className="mut xs">Owner{data.ownerRaised ? ' (claims)' : ''}</div><strong>{data.owner}</strong></div>
        <div><div className="mut xs">Renter{!data.ownerRaised ? ' (claims)' : ''}</div><strong>{data.booking.renterName}{data.renterRating ? ` · ${data.renterRating} ★` : ''}</strong></div>
        <div><div className="mut xs">On hold</div><strong>{inr(data.amountHeld)} of {inr(data.booking.deposit)}</strong></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
        {data.evidence.map((p) => <Thumb key={p.url} url={p.url} height={90} label={`${p.phase === 'pickup' ? 'Pick-up' : 'Return'} · ${p.label} · ${new Date(p.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`} />)}
      </div>
      {data.checklistNotes.map((c) => c.notes && <p key={c.phase} className="sm"><strong>{c.phase === 'pickup' ? 'Pick-up' : 'Return'} checklist:</strong> &quot;{c.notes}&quot;</p>)}
      <div className="bub th">{data.raisedBy}: {data.description}</div>
      {data.reply && <div className="bub me" style={{ alignSelf: 'flex-start', background: '#fff', color: 'var(--ink)', border: '1px solid var(--line)' }}>Other side: {data.reply}</div>}
      {resolved ? (
        <div className="note g">Resolved: {data.decisionReason}</div>
      ) : (
        <>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <legend className="lbl">Decision</legend>
            {([
              ['refund_full', `Refund ${inr(data.amountHeld)} to the renter`],
              ['partial', 'Partial — keep some for the owner'],
              ['keep', `Keep ${inr(data.amountHeld)} for the owner`],
            ] as const).map(([k, label]) => (
              <label key={k} className="li" style={{ cursor: 'pointer', borderColor: decision === k ? 'var(--green)' : undefined }}>
                <input type="radio" name="dec" checked={decision === k} onChange={() => setDecision(k)} style={{ accentColor: 'var(--green)' }} />
                {label}
              </label>
            ))}
            {decision === 'partial' && <input className="in" inputMode="numeric" aria-label="Amount kept for the owner" placeholder="Amount kept for the owner (₹)" value={kept} onChange={(e) => setKept(e.target.value.replace(/\D/g, ''))} style={{ maxWidth: 280 }} />}
          </fieldset>
          <div>
            <label className="lbl" htmlFor="rs">Reason (shared with both)</label>
            <textarea id="rs" className="in" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {err && <div className="note r sm" role="alert">{err}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn bp" disabled={busy || reason.length < 5} onClick={() => void run(`/admin/disputes/${id}/decide`, { decision, amountKept: decision === 'partial' ? Number(kept || 0) : undefined, reason })}>
              Confirm{refund ? ` & refund ${inr(refund)}` : ''}
            </button>
            <button type="button" className="btn bs" disabled={busy} onClick={() => void run(`/admin/disputes/${id}/ask-evidence`)}>Ask for more evidence</button>
            <button type="button" className="btn bt" disabled={busy} onClick={() => void run(`/admin/disputes/${id}/escalate`)}>Escalate to admin</button>
          </div>
        </>
      )}
    </section>
  );
}

function Users() {
  const staff = useStaff();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const { data, reload } = useApi<UserRow[]>(`/admin/users${search ? `?q=${encodeURIComponent(search)}` : ''}`, { staff: true });
  const [err, setErr] = useState<string | null>(null);

  async function setStatus(u: UserRow, status: UserRow['status']) {
    const reason = window.prompt(status === 'banned' ? 'Reason for the ban (logged)' : 'Reason (logged)');
    if (!reason) return;
    setErr(null);
    try {
      await api(`/admin/users/${u.id}/status`, { body: { status, reason }, staff: true });
      reload();
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  return (
    <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflowX: 'auto' }} aria-label="Users">
      <form onSubmit={(e) => { e.preventDefault(); setSearch(q); }} style={{ display: 'flex', gap: 8 }}>
        <input className="in" aria-label="Search users" placeholder="Name, business or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className="btn bs">Search</button>
      </form>
      {err && <div className="note r sm">{err}</div>}
      <table className="tbl">
        <thead><tr><th>User</th><th>Roles</th><th>Verification</th><th>Rating</th><th>Flags</th><th>Status</th><th /></tr></thead>
        <tbody>
          {data?.map((u) => (
            <tr key={u.id}>
              <td><strong>{u.name}</strong><div className="xs mut">{u.phone}</div></td>
              <td className="sm">{u.roles.join(' · ') || '—'}</td>
              <td className="sm">{u.verification}</td>
              <td>{u.rating ?? '—'}</td>
              <td className="sm">{u.reports ? `${u.reports} report${u.reports > 1 ? 's' : ''}` : '—'}</td>
              <td><span className={`chip ${u.status === 'active' ? 'ok' : u.status === 'watch' ? 'wa' : 'er'}`}>{u.status === 'watch' ? 'Under watch' : u.status === 'banned' ? 'Banned' : 'Active'}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {u.status !== 'watch' && u.status !== 'banned' && <button type="button" className="btn bt" style={{ minHeight: 30 }} onClick={() => void setStatus(u, 'watch')}>Watch</button>}
                {u.status !== 'active' && <button type="button" className="btn bt" style={{ minHeight: 30 }} onClick={() => void setStatus(u, 'active')}>Restore</button>}
                {staff.role === 'admin' && u.status !== 'banned' && <button type="button" className="btn bt" style={{ minHeight: 30, color: '#9B1C13' }} onClick={() => void setStatus(u, 'banned')}>Ban</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="xs mut">Banning hides all listings, cancels upcoming bookings with full refunds and signs the user out.</p>
    </section>
  );
}

function Refunds() {
  const { data, setData } = useApi<{ bookingId: string; code: string; kind: string; note: string; amount: number }[]>('/admin/refunds', { staff: true });
  const [err, setErr] = useState<string | null>(null);
  return (
    <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Refunds waiting">
      <h2 style={{ fontSize: 20 }}>Refunds &amp; settlements waiting</h2>
      {err && <div className="note r sm">{err}</div>}
      {data?.length === 0 && <p className="sm mut">Nothing waiting.</p>}
      {data?.map((r) => (
        <div key={r.bookingId} className="li" style={{ flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px' }}><strong>#{r.code}</strong> <span className="sm">· {r.note}</span></div>
          <strong>{inr(r.amount)}</strong>
          <button type="button" className="btn bp" style={{ minHeight: 34 }} onClick={() => void api<typeof data>(`/admin/bookings/${r.bookingId}/settle`, { method: 'POST', staff: true }).then((x) => x && setData(x)).catch((e: unknown) => setErr(errorMessage(e)))}>
            {r.kind === 'refund' ? 'Refund' : 'Settle deposit'}
          </button>
        </div>
      ))}
    </section>
  );
}

function Reports() {
  const staff = useStaff();
  const { data, setData } = useApi<{ id: string; reason: string; details: string | null; listing: { id: string; title: string } | null; targetUserId: string | null; reporter: string | null; createdAt: string }[]>('/admin/reports', { staff: true });
  const act = (id: string, status: string, pauseListing = false) => void api<typeof data>(`/admin/reports/${id}`, { body: { status, pauseListing }, staff: true }).then((x) => x && setData(x));
  return (
    <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Reports">
      <h2 style={{ fontSize: 20 }}>Open reports</h2>
      {data?.length === 0 && <p className="sm mut">No open reports.</p>}
      {data?.map((r) => (
        <div key={r.id} className="li" style={{ flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <strong>{r.reason}</strong>
            <div className="sm">{r.listing ? <Link href={`/listings/${r.listing.id}`} target="_blank">{r.listing.title}</Link> : `User ${r.targetUserId?.slice(0, 8)}`} · by {r.reporter ?? 'user'}</div>
            {r.details && <div className="sm mut">&quot;{r.details}&quot;</div>}
          </div>
          {r.listing && staff.role === 'admin' && <button type="button" className="btn bdo" style={{ minHeight: 34 }} onClick={() => act(r.id, 'actioned', true)}>Pause listing</button>}
          <button type="button" className="btn bs" style={{ minHeight: 34 }} onClick={() => act(r.id, 'actioned')}>Handled</button>
          <button type="button" className="btn bt" style={{ minHeight: 34 }} onClick={() => act(r.id, 'dismissed')}>Dismiss</button>
        </div>
      ))}
    </section>
  );
}

function Sos() {
  const { data, setData } = useApi<{ id: string; user: string | null; phone: string; booking: string | null; lat: number | null; lng: number | null; note: string | null; createdAt: string }[]>('/admin/sos', { staff: true, pollMs: 15_000 });
  return (
    <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="SOS">
      <h2 style={{ fontSize: 20 }}>Active SOS</h2>
      {data?.length === 0 && <p className="sm mut">No active SOS.</p>}
      {data?.map((s) => (
        <div key={s.id} className="li" style={{ flexWrap: 'wrap', borderColor: '#F2C3BE', background: '#FDECEA' }}>
          <div style={{ flex: '1 1 260px' }}>
            <strong>{s.user ?? 'User'} · <a href={`tel:${s.phone}`}>{s.phone}</a></strong>
            <div className="sm">{s.booking ? `Booking #${s.booking} · ` : ''}{new Date(s.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}{s.note ? ` · ${s.note}` : ''}</div>
            {s.lat !== null && s.lng !== null && <a className="sm" href={`https://www.google.com/maps?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer">Open location in Maps</a>}
          </div>
          <button type="button" className="btn bp" style={{ minHeight: 34 }} onClick={() => void api<typeof data>(`/admin/sos/${s.id}/resolve`, { method: 'POST', staff: true }).then((x) => x && setData(x))}>Resolved</button>
        </div>
      ))}
    </section>
  );
}

type SupportThread = { messages: { id: string; kind: string; mine: boolean; fromSupport: boolean; body: string | null; createdAt: string }[] };

function Support() {
  const inbox = useApi<{ id: string; user: string; lastMessage: string | null; lastMessageAt: string; waiting: boolean }[]>('/admin/support', { staff: true, pollMs: 15_000 });
  const [selected, setSelected] = useState<string | null>(null);
  const thread = useApi<SupportThread>(selected ? `/admin/support/${selected}` : null, { staff: true, pollMs: 5_000 });
  const [reply, setReply] = useState('');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
      <section className="card" style={{ flex: '1 1 260px', maxWidth: 340 }} aria-label="Support inbox">
        {inbox.data?.length === 0 && <p className="sm mut" style={{ padding: 16 }}>No support chats.</p>}
        {inbox.data?.map((c) => (
          <button key={c.id} type="button" onClick={() => setSelected(c.id)} style={{ width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid #EEEBE4', padding: 14, background: selected === c.id ? 'var(--green-tint)' : '#fff', cursor: 'pointer' }}>
            <span style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{c.user}</strong>{c.waiting && <span className="chip wa">Waiting</span>}</span>
            <span className="sm mut">{c.lastMessage}</span>
          </button>
        ))}
      </section>
      {selected && (
        <section className="card" style={{ flex: '999 1 480px', padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Support conversation">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
            {thread.data?.messages.map((m) =>
              m.kind === 'system' ? <div key={m.id} className="note sm">{m.body}</div> : <div key={m.id} className={`bub ${m.fromSupport ? 'me' : 'th'}`}>{m.body}</div>,
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void api(`/admin/support/${selected}/reply`, { body: { body: reply }, staff: true }).then(() => { setReply(''); thread.reload(); inbox.reload(); }); }} style={{ display: 'flex', gap: 8 }}>
            <input className="in" aria-label="Reply" value={reply} onChange={(e) => setReply(e.target.value)} />
            <button type="submit" className="btn bp" disabled={!reply.trim()}>Send</button>
          </form>
        </section>
      )}
    </div>
  );
}
