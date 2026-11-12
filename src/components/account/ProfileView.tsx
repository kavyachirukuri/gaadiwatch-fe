'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage, useAuth, useRequireAuth, type Me } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { useMeta } from '@/lib/use-meta';

type PublicProfile = {
  name: string;
  memberSince: string;
  verified: { phone: boolean; kyc: boolean; licence: boolean; operator: boolean };
  asRenter: { average: number; count: number } | null;
  asSeller: { average: number; count: number } | null;
  asBuyer: { average: number; count: number } | null;
  completedTrips: number;
  sales: number;
  replyMinutes: number | null;
  reviews: { id: string; rating: number; comment: string | null; role: string; author: string; createdAt: string }[];
};
type Prefs = { topics: string[]; channels: string[]; prefs: Record<string, Record<string, boolean>> };
type Notification = { id: string; kind: string; title: string; body: string; link: string | null; readAt: string | null; createdAt: string };
type Saved = { id: string; mode: 'rent' | 'buy'; label: string; query: string; alerts: boolean };
type Method = { id: string; kind: string; label: string; isDefault: boolean };

const TOPIC_LABEL: Record<string, string> = {
  bookings: 'Booking requests & replies',
  reminders: 'Pick-up & return reminders',
  tracking: 'Tracking alerts (operators)',
  offers: 'Offers & chat messages',
  saved_searches: 'New listings from saved searches',
};
const CHANNEL_LABEL: Record<string, string> = { push: 'Push', sms: 'SMS', whatsapp: 'WhatsApp' };
const month = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
const time = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export function ProfileView() {
  const { user } = useRequireAuth();
  if (!user) return <main className="wrap mut">Loading…</main>;
  return <Profile user={user} />;
}

function Profile({ user }: { user: Me }) {
  const pub = useApi<PublicProfile>(`/users/${user.id}`);
  const p = pub.data;
  const initials = (user.name ?? user.phone.slice(-2)).split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <main className="wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      <section className="card" style={{ flex: '1 1 300px', maxWidth: 380, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Your profile">
        <div className="av" style={{ width: 72, height: 72, fontSize: 24 }}>{initials}</div>
        <EditName user={user} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="chip ok">Phone verified</span>
          {user.kycStatus === 'verified' && <span className="chip ok">Aadhaar KYC</span>}
          {user.licenceStatus === 'verified' && <span className="chip ok">Driving licence</span>}
          {user.operator?.status === 'verified' && <span className="chip ok">Rental operator</span>}
          <span className="chip">Member since {month(user.createdAt)}</span>
        </div>
        {p && (
          <p className="sm">
            {p.asRenter ? `${p.asRenter.average} ★ as renter (${p.completedTrips} trips)` : `${p.completedTrips} trips`}
            {p.asSeller ? ` · ${p.asSeller.average} ★ as seller (${p.sales} sale${p.sales === 1 ? '' : 's'})` : ''}
            {p.replyMinutes ? ` · replies in ~${p.replyMinutes} min` : ''}
          </p>
        )}
        <Link className="btn bs" href="/verify">Verification</Link>
        <hr className="hr" />
        <h2 style={{ fontSize: 18 }}>What people say</h2>
        {p?.reviews.length === 0 && <p className="sm mut">No reviews yet.</p>}
        {p?.reviews.map((r) => (
          <div key={r.id} className="sm">
            <strong>{r.rating} ★ · {r.author}</strong> <span className="mut">({r.role === 'seller' ? 'as seller' : r.role === 'buyer' ? 'as buyer' : `as ${r.role}`}) · {month(r.createdAt)}</span>
            {r.comment && <p style={{ marginTop: 2 }}>{r.comment}</p>}
          </div>
        ))}
      </section>

      <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Notifications />
        <SavedSearches />
        <PaymentMethods />
        <Privacy />
      </div>
    </main>
  );
}

function EditName({ user }: { user: Me }) {
  const { setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [err, setErr] = useState<string | null>(null);
  if (!editing) {
    return (
      <div>
        <h1 style={{ fontSize: 26 }}>{user.name ?? 'Your profile'}</h1>
        <p className="sm mut">{user.phone}{user.email ? ` · ${user.email}` : ''}</p>
        <button type="button" className="btn bt" style={{ padding: 0, minHeight: 0, color: 'var(--green)' }} onClick={() => setEditing(true)}>Edit profile</button>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        void api<Me>('/me', { method: 'PATCH', body: { name, email: email || undefined } })
          .then((u) => { setUser(u); setEditing(false); })
          .catch((x: unknown) => setErr(errorMessage(x)));
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <label className="lbl" htmlFor="nm">Name</label>
      <input id="nm" className="in" value={name} onChange={(e) => setName(e.target.value)} required />
      <label className="lbl" htmlFor="em">Email (for invoices)</label>
      <input id="em" type="email" className="in" value={email} onChange={(e) => setEmail(e.target.value)} />
      {err && <div className="note r sm">{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn bp">Save</button>
        <button type="button" className="btn bt" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </form>
  );
}

function Notifications() {
  const prefs = useApi<Prefs>('/me/notification-prefs');
  const list = useApi<Notification[]>('/me/notifications');

  async function toggle(topic: string, channel: string, on: boolean) {
    prefs.setData(await api<Prefs>('/me/notification-prefs', { method: 'PUT', body: { topic, channel, on } }));
  }

  return (
    <section className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }} aria-labelledby="nt">
      <h2 id="nt" style={{ fontSize: 20 }}>Notifications</h2>
      {prefs.data && (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Notify me about</th>{prefs.data.channels.map((c) => <th key={c}>{CHANNEL_LABEL[c] ?? c}</th>)}</tr></thead>
            <tbody>
              {prefs.data.topics.map((t) => (
                <tr key={t}>
                  <td>{TOPIC_LABEL[t] ?? t}</td>
                  {prefs.data!.channels.map((c) => {
                    const on = prefs.data!.prefs[t]?.[c] ?? false;
                    return (
                      <td key={c}>
                        <button type="button" className={`tog ${on ? 'on' : ''}`} aria-pressed={on} aria-label={`${TOPIC_LABEL[t] ?? t} by ${CHANNEL_LABEL[c] ?? c}`} onClick={() => void toggle(t, c, !on)} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="xs mut" style={{ marginTop: 6 }}>SMS and WhatsApp delivery switches on once those services are connected; in-app notifications always work.</p>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 16 }}>Recent</h3>
        {list.data?.some((n) => !n.readAt) && (
          <button type="button" className="btn bt" style={{ minHeight: 30 }} onClick={() => void api('/me/notifications/read', { method: 'POST' }).then(list.reload)}>Mark all read</button>
        )}
      </div>
      {list.data?.length === 0 && <p className="sm mut">Nothing yet.</p>}
      {list.data?.slice(0, 15).map((n) => (
        <Link key={n.id} href={n.link ?? '#'} className="li" style={{ textDecoration: 'none', color: 'var(--ink)', background: n.readAt ? undefined : 'var(--green-tint)' }}>
          <span className="chip">{n.kind.replace('_', ' ')}</span>
          <span className="sm" style={{ flex: 1 }}><strong>{n.title}</strong> · {n.body}</span>
          <span className="xs mut">{time(n.createdAt)}</span>
        </Link>
      ))}
    </section>
  );
}

function SavedSearches() {
  const { data, setData } = useApi<Saved[]>('/me/saved-searches');
  return (
    <section className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }} aria-labelledby="ss">
      <h2 id="ss" style={{ fontSize: 20 }}>Saved searches</h2>
      {data?.length === 0 && <p className="sm mut">Use &quot;Save search&quot; on the Rent or Buy page to get alerts for new listings.</p>}
      {data?.map((x) => (
        <div key={x.id} className="li" style={{ flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px' }}>
            <strong>{x.label}</strong>
            <div className="xs mut">{x.mode === 'rent' ? 'Rent' : 'Buy'} · alerts {x.alerts ? 'on' : 'off'}</div>
          </div>
          <button type="button" className={`tog ${x.alerts ? 'on' : ''}`} aria-pressed={x.alerts} aria-label="Alerts" onClick={() => void api<Saved[]>(`/me/saved-searches/${x.id}`, { method: 'PATCH', body: { alerts: !x.alerts } }).then(setData)} />
          <Link className="btn bs" style={{ minHeight: 36 }} href={`/${x.mode}?${x.query}`}>Open</Link>
          <button type="button" className="btn bt" style={{ minHeight: 36 }} onClick={() => void api<Saved[]>(`/me/saved-searches/${x.id}`, { method: 'DELETE' }).then(setData)}>Delete</button>
        </div>
      ))}
    </section>
  );
}

function PaymentMethods() {
  const { data, setData } = useApi<Method[]>('/me/payment-methods');
  const [adding, setAdding] = useState(false);
  const [upi, setUpi] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <section className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }} aria-labelledby="pm">
      <h2 id="pm" style={{ fontSize: 20 }}>Payment methods</h2>
      {data?.map((m) => (
        <div key={m.id} className="li">
          <strong style={{ flex: 1 }}>{m.label}</strong>
          {m.isDefault ? (
            <span className="chip ok">Default</span>
          ) : (
            <button type="button" className="btn bt" style={{ minHeight: 32 }} onClick={() => void api<Method[]>(`/me/payment-methods/${m.id}/default`, { method: 'POST' }).then(setData)}>Make default</button>
          )}
          <button type="button" className="btn bt" style={{ minHeight: 32, color: '#9B1C13' }} onClick={() => void api<Method[]>(`/me/payment-methods/${m.id}`, { method: 'DELETE' }).then(setData)}>Remove</button>
        </div>
      ))}
      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            void api<Method[]>('/me/payment-methods', { body: { kind: 'upi', upiId: upi } })
              .then((r) => { setData(r); setAdding(false); setUpi(''); })
              .catch((x: unknown) => setErr(errorMessage(x)));
          }}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}
        >
          <div style={{ flex: '1 1 220px' }}><label className="lbl" htmlFor="upi">UPI ID</label><input id="upi" className="in" value={upi} onChange={(e) => setUpi(e.target.value.trim())} placeholder="name@okbank" required /></div>
          <button type="submit" className="btn bp">Add</button>
          <button type="button" className="btn bt" onClick={() => setAdding(false)}>Cancel</button>
          {err && <span className="sm" style={{ color: '#9B1C13', width: '100%' }}>{err}</span>}
          <span className="xs mut" style={{ width: '100%' }}>Cards are saved by the payment gateway at checkout — card numbers never reach GaadiWatch.</span>
        </form>
      ) : (
        <button type="button" className="btn bs" style={{ alignSelf: 'flex-start' }} onClick={() => setAdding(true)}>Add UPI ID</button>
      )}
    </section>
  );
}

function Privacy() {
  const { meta } = useMeta();
  const { signOut } = useAuth();
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  return (
    <section className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }} aria-labelledby="pd">
      <h2 id="pd" style={{ fontSize: 20 }}>Privacy &amp; data</h2>
      <p className="sm">Your location is shared with an operator only during an active rental you agreed to. All data is stored in India.</p>
      <div className="li" style={{ flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px' }}><strong>Language</strong><div className="xs mut">Telugu, Kannada and Hindi coming soon</div></div>
        <select className="in" style={{ width: 'auto' }} aria-label="Language" defaultValue="en"><option value="en">English</option></select>
      </div>
      <div className="li" style={{ flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px' }}><strong>Download my data</strong><div className="xs mut">Profile, bookings, chats and invoices as a ZIP, emailed within 24 h</div></div>
        <button type="button" className="btn bs" onClick={() => void api<{ message: string }>('/me/data-export', { method: 'POST' }).then((r) => setMsg(r.message)).catch((x: unknown) => setErr(errorMessage(x)))}>Request download</button>
      </div>
      <div className="li" style={{ flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px' }}><strong>Delete account</strong><div className="xs mut">Only after active rentals and open disputes are closed. Invoices are kept as tax law requires.</div></div>
        <button
          type="button"
          className="btn bdo"
          onClick={() => {
            if (!window.confirm('Delete your GaadiWatch account? This cannot be undone.')) return;
            setErr(null);
            void api('/me', { method: 'DELETE' })
              .then(async () => { await signOut(); router.push('/'); })
              .catch((x: unknown) => setErr(errorMessage(x)));
          }}
        >
          Delete account
        </button>
      </div>
      {msg && <div className="note g sm">{msg}</div>}
      {err && <div className="note r sm">{err}</div>}
      {meta?.grievanceEmail && <p className="xs mut">Questions about your data? Contact our grievance officer at <a href={`mailto:${meta.grievanceEmail}`}>{meta.grievanceEmail}</a></p>}
    </section>
  );
}
