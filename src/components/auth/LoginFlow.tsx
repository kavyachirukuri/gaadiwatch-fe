'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError, useAuth, type Me } from '@/lib/auth';

type Step = 'phone' | 'code' | 'name';

/** Only allow redirects inside this site */
function safeNext(raw: string | null) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
}

export function LoginFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const { user, ready, signIn, setUser } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already logged in (and has a name)? Go straight on.
  useEffect(() => {
    if (ready && user?.name && step === 'phone') router.replace(next ?? '/');
  }, [ready, user, step, next, router]);

  // Resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api<{ resendInSeconds: number; devCode?: string }>('/auth/otp/request', { body: { phone } });
      setDevCode(res.devCode ?? null);
      setResendIn(res.resendInSeconds);
      setCode('');
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the code. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api<{ token: string; isNew: boolean }>('/auth/otp/verify', { body: { phone, code, acceptedTerms: agreed } });
      const me = await signIn(res.token);
      if (res.isNew || !me.name) {
        setStep('name');
      } else {
        router.replace(next ?? '/');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not check the code. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const me = await api<Me>('/me', { method: 'PATCH', body: { name, ...(email ? { email } : {}) } });
      setUser(me);
      // New accounts go to verification first, then back to where they were heading
      router.replace(next ? `/verify?next=${encodeURIComponent(next)}` : '/verify');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 140px)', display: 'flex', flexWrap: 'wrap' }}>
      <aside style={{ flex: '1 1 420px', background: 'var(--hero)', color: '#fff', padding: 48, display: 'flex', flexDirection: 'column', gap: 28 }}>
        <h1 style={{ fontSize: 40, color: '#fff', maxWidth: 440 }}>One account to rent, buy, sell and list.</h1>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14, color: '#CFE3DC' }}>
          <li><strong style={{ color: '#fff' }}>Guest</strong> — browse and see prices, no sign-up needed</li>
          <li><strong style={{ color: '#fff' }}>Renter</strong> — phone OTP + Aadhaar KYC + driving licence</li>
          <li><strong style={{ color: '#fff' }}>Buyer</strong> — phone OTP + Aadhaar KYC</li>
          <li><strong style={{ color: '#fff' }}>Seller</strong> — KYC + RC for each vehicle</li>
          <li><strong style={{ color: '#fff' }}>Operator</strong> — KYC, GSTIN, rental licence, commercial RC + insurance</li>
        </ul>
        <p className="sm" style={{ color: '#A9C9BE', marginTop: 'auto' }}>
          Roles unlock as you finish each check. You can do them any time from Verification.
        </p>
      </aside>

      <main style={{ flex: '999 1 560px', padding: '48px 32px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        {step === 'phone' && (
          <form onSubmit={sendCode} className="card" style={{ flex: '1 1 360px', maxWidth: 440, padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }} aria-labelledby="s1">
            <span className="k">Step 1 of 2</span>
            <h2 id="s1" style={{ fontSize: 26 }}>Log in or sign up</h2>
            <div>
              <label className="lbl" htmlFor="ph">Mobile number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="in" style={{ width: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>+91</span>
                <input id="ph" className="in" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel-national" placeholder="98450 12345" required />
              </div>
            </div>
            <label className="sm" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--green)', marginTop: 2 }} />
              <span>
                I agree to the <Link href="/terms">Terms of use</Link> and <Link href="/privacy">Privacy policy</Link>, and consent to processing my data under the DPDP Act, 2023.
              </span>
            </label>
            {error && <div className="note r" role="alert">{error}</div>}
            <button type="submit" className="btn bp" disabled={busy || !agreed || phone.replace(/\D/g, '').length < 10}>
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
            <Link href={next ?? '/'} className="sm" style={{ alignSelf: 'center' }}>Continue browsing as guest</Link>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={verify} className="card" style={{ flex: '1 1 360px', maxWidth: 440, padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }} aria-labelledby="s2">
            <span className="k">Step 2 of 2</span>
            <h2 id="s2" style={{ fontSize: 26 }}>Enter the 6-digit code</h2>
            <p className="mut">
              Sent by SMS to +91 {phone.replace(/\D/g, '').slice(-10)}.{' '}
              <button type="button" className="btn bt" style={{ minHeight: 0, padding: 0 }} onClick={() => { setStep('phone'); setError(null); }}>Change number</button>
            </p>
            {devCode && (
              <div className="note w" role="status">
                <span><strong>Test mode:</strong> no SMS is sent. Your code is <strong>{devCode}</strong>.</span>
              </div>
            )}
            <div>
              <label className="lbl" htmlFor="otp">One-time password</label>
              <input
                id="otp"
                className="in"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.5em', textAlign: 'center' }}
              />
            </div>
            <p className="sm mut">
              {resendIn > 0 ? (
                `Resend code in 0:${String(resendIn).padStart(2, '0')}`
              ) : (
                <button type="button" className="btn bt" style={{ minHeight: 0, padding: 0 }} onClick={() => void sendCode()} disabled={busy}>
                  Resend code
                </button>
              )}
            </p>
            {error && <div className="note r" role="alert">{error}</div>}
            <button type="submit" className="btn bp" disabled={busy || code.length !== 6}>
              {busy ? 'Checking…' : 'Verify & continue'}
            </button>
          </form>
        )}

        {step === 'name' && (
          <form onSubmit={saveName} className="card" style={{ flex: '1 1 360px', maxWidth: 520, padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }} aria-labelledby="s3">
            <span className="k">New account</span>
            <h2 id="s3" style={{ fontSize: 26 }}>Tell us your name</h2>
            <p className="sm mut">Shown on your profile. It must match your Aadhaar for verification.</p>
            <div>
              <label className="lbl" htmlFor="nm">Full name</label>
              <input id="nm" className="in" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </div>
            <div>
              <label className="lbl" htmlFor="em">Email (optional, for invoices)</label>
              <input id="em" type="email" className="in" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            {error && <div className="note r" role="alert">{error}</div>}
            <button type="submit" className="btn bp" disabled={busy || name.trim().length < 2}>
              {busy ? 'Saving…' : 'Create account'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
