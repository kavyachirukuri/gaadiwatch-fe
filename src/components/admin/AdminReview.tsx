'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, errorMessage } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { inr } from '@/lib/format';
import { Thumb } from '@/components/ui/FilePick';
import { useStaff } from './AdminShell';

type Row = { id: string; title: string; owner: string; purpose: string; city: string; waitingHours: number; flag: string; ok: boolean };
type Detail = {
  id: string;
  status: string;
  title: string;
  registration: string;
  purpose: string;
  city: string;
  area: string;
  salePrice: number | null;
  pricePerDay: number | null;
  reviewNote: string | null;
  owner: { name: string | null; kyc: boolean; gstin: boolean; operator: string | null; rentalLicenceNo: string | null };
  photos: string[];
  documents: { type: string; url: string; expiresAt: string | null }[];
  checks: { check: string; entered: string; source: string; result: 'ok' | 'mismatch' | 'missing'; needsLook: boolean }[];
};
type People = {
  people: { id: string; name: string | null; kycStatus: string; licenceStatus: string; licenceClasses: string[]; aadhaar: string | null }[];
  operators: { userId: string; businessName: string; owner: string | null; city: string; gstin: string | null; rentalLicenceNo: string | null }[];
};

export function AdminReview() {
  const tab = useSearchParams().get('tab') === 'people' ? 'people' : 'listings';
  const [current, setCurrent] = useState(tab);
  const list = useApi<Row[]>('/admin/review/listings', { staff: true });
  const people = useApi<People>('/admin/review/people', { staff: true });
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = selected ?? list.data?.[0]?.id ?? null;
  const peopleCount = (people.data?.people.length ?? 0) + (people.data?.operators.length ?? 0);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 30 }}>Review queue</h1>
        <div className="seg">
          <button type="button" className={current === 'listings' ? 'on' : ''} onClick={() => setCurrent('listings')}>Listings ({list.data?.length ?? 0})</button>
          <button type="button" className={current === 'people' ? 'on' : ''} onClick={() => setCurrent('people')}>KYC &amp; licences ({peopleCount})</button>
        </div>
      </div>

      {current === 'listings' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
          <section className="card" style={{ flex: '1 1 280px', maxWidth: 360, display: 'flex', flexDirection: 'column' }} aria-label="Listings waiting">
            {list.data?.length === 0 && <p className="sm mut" style={{ padding: 16 }}>Nothing waiting.</p>}
            {list.data?.map((r) => (
              <button key={r.id} type="button" onClick={() => setSelected(r.id)} style={{ textAlign: 'left', border: 0, borderBottom: '1px solid #EEEBE4', padding: 14, background: chosen === r.id ? 'var(--green-tint)' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{r.title}</strong><span className="xs mut">{r.waitingHours} h</span></span>
                <span className="sm mut">{r.owner} · {r.purpose === 'both' ? 'Rent + sale' : r.purpose === 'rent' ? 'Rent' : 'Sale'} · {r.city}</span>
                <span className={`chip ${r.ok ? 'ok' : 'er'}`} style={{ alignSelf: 'flex-start' }}>{r.flag}</span>
              </button>
            ))}
          </section>
          {chosen && <ListingReview key={chosen} id={chosen} onDone={() => { setSelected(null); list.reload(); }} />}
        </div>
      ) : (
        <PeopleReview data={people.data} onChange={people.setData} />
      )}
    </>
  );
}

function ListingReview({ id, onDone }: { id: string; onDone: () => void }) {
  const staff = useStaff();
  const { data } = useApi<Detail>(`/admin/review/listings/${id}`, { staff: true });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!data) return <p className="mut">Loading…</p>;
  const privateForRent = data.checks.some((c) => c.check === 'Registration type' && c.result === 'mismatch');

  async function decide(decision: string) {
    setBusy(true);
    setErr(null);
    try {
      await api(`/admin/review/listings/${id}/decision`, { body: { decision, message: message || undefined }, staff: true });
      onDone();
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ flex: '999 1 520px', minWidth: 0, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }} aria-label={data.title}>
      <div>
        <h2 style={{ fontSize: 22 }}>{data.title} · {data.registration}</h2>
        <p className="sm mut">
          {data.owner.name} · submitted for {data.purpose === 'both' ? 'rent + sale' : data.purpose} · {data.area}, {data.city} ·{' '}
          {[data.owner.kyc && 'owner KYC', data.owner.gstin && 'GSTIN', data.owner.operator === 'verified' && 'licence verified'].filter(Boolean).join(', ') || 'owner not verified'}
        </p>
        <p className="sm">{data.pricePerDay ? `${inr(data.pricePerDay)}/day` : ''}{data.pricePerDay && data.salePrice ? ' · ' : ''}{data.salePrice ? `Sale ${inr(data.salePrice)}` : ''}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
        {data.photos.map((u, i) => <Thumb key={u} url={u} height={80} label={`Photo ${i + 1}`} />)}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {data.documents.map((d) => <a key={d.type} className="chip" href={d.url} target="_blank" rel="noreferrer">{d.type.toUpperCase()}{d.expiresAt ? ` · to ${new Date(d.expiresAt).toLocaleDateString('en-IN')}` : ''}</a>)}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead><tr><th>Check</th><th>Owner entered</th><th>Rule / document</th><th>Result</th></tr></thead>
          <tbody>
            {data.checks.map((c) => (
              <tr key={c.check}>
                <td>{c.check}</td>
                <td>{c.entered}</td>
                <td className="sm">{c.source}</td>
                <td><span className={`chip ${c.result === 'ok' ? (c.needsLook ? 'wa' : 'ok') : 'er'}`}>{c.result === 'ok' ? (c.needsLook ? 'Check document' : 'OK') : c.result === 'mismatch' ? 'Mismatch' : 'Missing'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {privateForRent && <div className="note r"><span><strong>Rent blocked.</strong> The registration is private (white-plate). This vehicle can only be listed for sale.</span></div>}
      <div>
        <label className="lbl" htmlFor="mo">Message to owner</label>
        <textarea id="mo" className="in" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Needed for “request changes” and “reject”" />
      </div>
      {err && <div className="note r sm" role="alert">{err}</div>}
      {staff.role === 'admin' ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {data.purpose !== 'sell' && data.salePrice && <button type="button" className="btn bs" disabled={busy} onClick={() => void decide('approve_sale_only')}>Approve for sale only</button>}
          <button type="button" className="btn bs" disabled={busy} onClick={() => void decide('changes')}>Request changes</button>
          <button type="button" className="btn bdo" disabled={busy} onClick={() => void decide('reject')}>Reject</button>
          <button type="button" className="btn bp" disabled={busy || privateForRent} onClick={() => void decide('approve')}>Approve</button>
        </div>
      ) : (
        <p className="sm mut">Only admins can approve or reject listings.</p>
      )}
      <p className="xs mut">Decision and reviewer are logged. The owner is notified.</p>
    </section>
  );
}

function PeopleReview({ data, onChange }: { data: People | null; onChange: (d: People) => void }) {
  const staff = useStaff();
  const [err, setErr] = useState<string | null>(null);
  if (!data) return <p className="mut">Loading…</p>;

  async function verify(userId: string, what: 'kyc' | 'licence' | 'operator', approve: boolean) {
    setErr(null);
    const note = approve ? undefined : window.prompt('Reason (shown to the user)') ?? undefined;
    try {
      onChange(await api<People>(`/admin/users/${userId}/verify`, { body: { what, approve, note }, staff: true }));
    } catch (e) {
      setErr(errorMessage(e));
    }
  }
  const canAct = staff.role === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {err && <div className="note r">{err}</div>}
      <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }} aria-labelledby="op">
        <h2 id="op" style={{ fontSize: 20 }}>Rental operators</h2>
        {data.operators.length === 0 && <p className="sm mut">None waiting.</p>}
        {data.operators.map((o) => (
          <div key={o.userId} className="li" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <strong>{o.businessName}</strong>
              <div className="xs mut">{o.owner} · {o.city} · GSTIN {o.gstin ?? '—'} · licence {o.rentalLicenceNo ?? '—'}</div>
            </div>
            {canAct && <button type="button" className="btn bdo" style={{ minHeight: 36 }} onClick={() => void verify(o.userId, 'operator', false)}>Reject</button>}
            {canAct && <button type="button" className="btn bp" style={{ minHeight: 36 }} onClick={() => void verify(o.userId, 'operator', true)}>Approve</button>}
          </div>
        ))}
      </section>
      <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }} aria-labelledby="kp">
        <h2 id="kp" style={{ fontSize: 20 }}>KYC &amp; driving licences</h2>
        {data.people.length === 0 && <p className="sm mut">None waiting.</p>}
        {data.people.map((p) => (
          <div key={p.id} className="li" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <strong>{p.name ?? 'User'}</strong>
              <div className="xs mut">Aadhaar {p.aadhaar ?? '—'} · KYC {p.kycStatus} · DL {p.licenceStatus}{p.licenceClasses.length ? ` (${p.licenceClasses.join(', ')})` : ''}</div>
            </div>
            {canAct && p.kycStatus === 'pending' && <button type="button" className="btn bs" style={{ minHeight: 36 }} onClick={() => void verify(p.id, 'kyc', true)}>Approve KYC</button>}
            {canAct && p.licenceStatus === 'pending' && <button type="button" className="btn bs" style={{ minHeight: 36 }} onClick={() => void verify(p.id, 'licence', true)}>Approve DL</button>}
            {canAct && <button type="button" className="btn bdo" style={{ minHeight: 36 }} onClick={() => void verify(p.id, p.kycStatus === 'pending' ? 'kyc' : 'licence', false)}>Reject</button>}
          </div>
        ))}
      </section>
    </div>
  );
}
