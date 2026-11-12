'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, ApiError, useAuth, useRequireAuth, type Me } from '@/lib/auth';
import { useMeta } from '@/lib/use-meta';

const LICENCE_CLASSES = [
  { key: 'MCWG', label: 'Two-wheeler with gear (MCWG)' },
  { key: 'LMV', label: 'Car / light motor vehicle (LMV)' },
  { key: 'TRANS', label: 'Transport / commercial (TRANS)' },
];

function StatusChip({ status }: { status: Me['kycStatus'] }) {
  const map = {
    verified: ['ok', 'Verified'],
    pending: ['wa', 'In review'],
    rejected: ['er', 'Not verified'],
    not_started: ['', 'Not started'],
  } as const;
  const [cls, text] = map[status];
  return <span className={`chip ${cls}`}>{text}</span>;
}

export function VerifyCenter() {
  const { user, ready } = useRequireAuth();
  const { setUser } = useAuth();
  const { meta } = useMeta();
  const next = useSearchParams().get('next');

  if (!ready || !user) return <main className="wrap mut">Loading…</main>;

  const canRent = user.kycStatus === 'verified' && user.licenceStatus === 'verified';

  return (
    <main className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 style={{ fontSize: 32 }}>Verification</h1>
        <p className="mut">Finish these once. Renting needs KYC and a driving licence; listing vehicles for rent also needs an operator profile.</p>
      </div>

      {canRent && next && (
        <div className="note g" role="status">
          <span>You&apos;re verified to rent. <Link href={next}>Continue where you left off →</Link></span>
        </div>
      )}

      <Section title="Mobile number" status="verified">
        <p className="sm">{user.phone} · verified with OTP</p>
      </Section>

      <KycSection user={user} onDone={setUser} />
      <LicenceSection user={user} onDone={setUser} />
      <OperatorSection user={user} onDone={setUser} cities={meta?.cities ?? []} />
    </main>
  );
}

function Section({ title, status, children }: { title: string; status: Me['kycStatus']; children: React.ReactNode }) {
  return (
    <section className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }} aria-label={title}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 20 }}>{title}</h2>
        <StatusChip status={status} />
      </div>
      {children}
    </section>
  );
}

function useSubmit(onDone: (u: Me) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(path: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      onDone(await api<Me>(path, { body }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

function KycSection({ user, onDone }: { user: Me; onDone: (u: Me) => void }) {
  const [aadhaar, setAadhaar] = useState('');
  const [name, setName] = useState(user.name ?? '');
  const [consent, setConsent] = useState(false);
  const { busy, error, run } = useSubmit(onDone);

  return (
    <Section title="Aadhaar KYC" status={user.kycStatus}>
      {user.kycStatus === 'verified' ? (
        <p className="sm">Aadhaar ending {user.aadhaarLast4} · we only keep the last 4 digits.</p>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); void run('/me/verification/kyc', { aadhaarNumber: aadhaar, nameOnAadhaar: name, consent }); }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <label className="lbl" htmlFor="ad">Aadhaar number</label>
              <input id="ad" className="in" inputMode="numeric" value={aadhaar} onChange={(e) => setAadhaar(e.target.value.replace(/[^\d ]/g, '').slice(0, 14))} placeholder="1234 5678 9012" required />
            </div>
            <div>
              <label className="lbl" htmlFor="an">Name as on Aadhaar</label>
              <input id="an" className="in" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>
          <label className="sm" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--green)', marginTop: 2 }} />
            <span>I consent to GaadiWatch verifying my Aadhaar through a licensed KYC provider. Only the last 4 digits are stored.</span>
          </label>
          {error && <div className="note r" role="alert">{error}</div>}
          <button type="submit" className="btn bp" style={{ alignSelf: 'flex-start' }} disabled={busy || !consent}>
            {busy ? 'Verifying…' : 'Verify Aadhaar'}
          </button>
        </form>
      )}
    </Section>
  );
}

function LicenceSection({ user, onDone }: { user: Me; onDone: (u: Me) => void }) {
  const [number, setNumber] = useState('');
  const [dob, setDob] = useState('');
  const [classes, setClasses] = useState<string[]>(['MCWG']);
  const { busy, error, run } = useSubmit(onDone);
  const kycDone = user.kycStatus === 'verified';

  return (
    <Section title="Driving licence" status={user.licenceStatus}>
      {user.licenceStatus === 'verified' ? (
        <p className="sm">Classes on your licence: {user.licenceClasses.join(', ') || '—'}</p>
      ) : !kycDone ? (
        <p className="sm mut">Finish Aadhaar KYC first.</p>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); void run('/me/verification/licence', { licenceNumber: number, dateOfBirth: dob, classes }); }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <label className="lbl" htmlFor="dl">Licence number</label>
              <input id="dl" className="in" value={number} onChange={(e) => setNumber(e.target.value.toUpperCase())} placeholder="KA0120230001234" required />
            </div>
            <div>
              <label className="lbl" htmlFor="dob">Date of birth</label>
              <input id="dob" type="date" className="in" value={dob} onChange={(e) => setDob(e.target.value)} required />
            </div>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <legend className="lbl">Vehicle classes on your licence</legend>
            {LICENCE_CLASSES.map((c) => (
              <label key={c.key} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={classes.includes(c.key)}
                  onChange={() => setClasses((cur) => (cur.includes(c.key) ? cur.filter((x) => x !== c.key) : [...cur, c.key]))}
                  style={{ width: 18, height: 18, accentColor: 'var(--green)' }}
                />
                {c.label}
              </label>
            ))}
          </fieldset>
          {error && <div className="note r" role="alert">{error}</div>}
          <button type="submit" className="btn bp" style={{ alignSelf: 'flex-start' }} disabled={busy || classes.length === 0}>
            {busy ? 'Verifying…' : 'Verify licence'}
          </button>
        </form>
      )}
    </Section>
  );
}

function OperatorSection({ user, onDone, cities }: { user: Me; onDone: (u: Me) => void; cities: { key: string; name: string }[] }) {
  const op = user.operator;
  const [open, setOpen] = useState(false);
  const [businessName, setBusinessName] = useState(op?.businessName ?? '');
  const [city, setCity] = useState(op?.city ?? '');
  const [gstin, setGstin] = useState(op?.gstin ?? '');
  const [licence, setLicence] = useState(op?.rentalLicenceNo ?? '');
  const { busy, error, run } = useSubmit((u) => { onDone(u); setOpen(false); });
  const kycDone = user.kycStatus === 'verified';

  return (
    <Section title="Rental operator (optional)" status={op?.status ?? 'not_started'}>
      {op && !open ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <p className="sm">
            {op.businessName} · {cities.find((c) => c.key === op.city)?.name ?? op.city} · licence {op.rentalLicenceNo}
            {op.status === 'pending' ? ' · our team will review it shortly' : ''}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {op.status === 'verified' && <Link className="btn bs" href="/operator">Operator dashboard</Link>}
            <button type="button" className="btn bt" onClick={() => setOpen(true)}>Edit</button>
          </div>
        </div>
      ) : !kycDone ? (
        <p className="sm mut">Finish Aadhaar KYC first. Only licensed rental businesses can list vehicles for rent; anyone can list a vehicle for sale.</p>
      ) : !open && !op ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <p className="sm mut">Run a licensed rental business? Register to list commercial vehicles for rent.</p>
          <button type="button" className="btn bs" onClick={() => setOpen(true)}>Register as operator</button>
        </div>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); void run('/me/operator', { businessName, city, rentalLicenceNo: licence, ...(gstin ? { gstin } : {}) }); }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}
        >
          <div>
            <label className="lbl" htmlFor="bn">Business name</label>
            <input id="bn" className="in" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
          </div>
          <div>
            <label className="lbl" htmlFor="ct">City</label>
            <select id="ct" className="in" value={city} onChange={(e) => setCity(e.target.value)} required>
              <option value="" disabled>Choose city</option>
              {cities.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl" htmlFor="gst">GSTIN (optional)</label>
            <input id="gst" className="in" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="29ABCDE1234F1Z5" />
          </div>
          <div>
            <label className="lbl" htmlFor="rl">Rental licence / permit number</label>
            <input id="rl" className="in" value={licence} onChange={(e) => setLicence(e.target.value)} required />
          </div>
          {error && <div className="note r" role="alert" style={{ gridColumn: '1 / -1' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, gridColumn: '1 / -1' }}>
            <button type="submit" className="btn bp" disabled={busy}>{busy ? 'Saving…' : 'Submit for review'}</button>
            <button type="button" className="btn bt" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </Section>
  );
}
