'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage, STAFF_TOKEN_KEY, writeToken } from '@/lib/auth';
import { Logo } from '@/components/Logo';

export function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function step1(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ challengeId: string }>('/admin/auth/login', { body: { email, password } });
      setChallengeId(r.challengeId);
      setPassword('');
    } catch (x) {
      setErr(errorMessage(x));
    } finally {
      setBusy(false);
    }
  }

  async function step2(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ token: string }>('/admin/auth/verify', { body: { challengeId, code } });
      writeToken(r.token, STAFF_TOKEN_KEY);
      router.replace('/admin');
    } catch (x) {
      setErr(errorMessage(x));
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--ground)' }}>
      <section className="card" style={{ width: '100%', maxWidth: 420, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }} aria-labelledby="t">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Logo /><strong>Admin</strong></div>
        {!challengeId ? (
          <form onSubmit={(e) => void step1(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h1 id="t" style={{ fontSize: 24 }}>Staff sign-in</h1>
            <div><label className="lbl" htmlFor="em">Work email</label><input id="em" type="email" className="in" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><label className="lbl" htmlFor="pw">Password</label><input id="pw" type="password" className="in" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            {err && <div className="note r sm" role="alert">{err}</div>}
            <button type="submit" className="btn bp" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
            <p className="xs mut">Internal accounts only. Every action is logged.</p>
          </form>
        ) : (
          <form onSubmit={(e) => void step2(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="k">Step 2 · two-factor</span>
            <h1 id="t" style={{ fontSize: 22 }}>Enter the code from your authenticator app</h1>
            <input className="in" inputMode="numeric" autoComplete="one-time-code" aria-label="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} style={{ fontSize: 24, letterSpacing: '.4em', textAlign: 'center' }} autoFocus />
            {err && <div className="note r sm" role="alert">{err}</div>}
            <button type="submit" className="btn bp" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify & sign in'}</button>
            <button type="button" className="btn bt" onClick={() => { setChallengeId(null); setCode(''); }}>Start again</button>
          </form>
        )}
      </section>
    </main>
  );
}
