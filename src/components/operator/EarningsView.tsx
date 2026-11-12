'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, downloadFile, errorMessage, useRequireAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { inr } from '@/lib/format';

type Earnings = {
  month: string;
  gross: number;
  rentals: number;
  commission: number;
  commissionSaved: number;
  commissionRate: number;
  launchOfferEndsAt: string | null;
  damageRecovered: number;
  claimsSettled: number;
  paidOutThisMonth: number;
  nextPayout: { amount: number; on: string };
  bank: { name: string | null; last4: string; ifsc: string | null } | null;
  gstin: string | null;
  daily: { date: string; amount: number }[];
  weeks: { weekStart: string; weekEnd: string; rentals: number; gross: number; commission: number; tcs: number; net: number; status: string; payOn: string; paidAt: string | null }[];
  perVehicle: { vehicleId: string; title: string; registration: string; daysRented: number; daysElapsed: number; utilisation: number; earned: number }[];
  invoices: { number: string; code: string; title: string; amount: number; date: string }[];
};

const d = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => new Date(iso).toLocaleDateString('en-IN', opts);

function monthOptions(count = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const x = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { key: `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`, label: x.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
  });
}

export function EarningsView() {
  const { user } = useRequireAuth();
  const [months] = useState(() => monthOptions());
  const [month, setMonth] = useState(months[0].key);
  const { data, error, reload } = useApi<Earnings>(user ? `/operator/earnings?month=${month}` : null);
  const [bankOpen, setBankOpen] = useState(false);

  if (error && !data) return <main className="wrap"><div className="note r">{error}</div></main>;
  if (!data) return <main className="wrap mut">Loading…</main>;
  const e = data;
  const max = Math.max(1, ...e.daily.map((x) => x.amount));
  const launch = e.launchOfferEndsAt && new Date(e.launchOfferEndsAt).getTime() > new Date(`${e.month}-01`).getTime();

  return (
    <main className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Link href="/operator" className="sm">← Dashboard</Link>
          <h1 style={{ fontSize: 32 }}>Earnings &amp; payouts</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="in" style={{ width: 'auto' }} aria-label="Month" value={month} onChange={(ev) => setMonth(ev.target.value)}>
            {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <button type="button" className="btn bs" onClick={() => void downloadFile(`/operator/earnings/statement?month=${month}`, `gaadiwatch-statement-${month}.csv`)}>Download statement</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="card kpi"><span className="sm mut">Gross bookings</span><b>{inr(e.gross)}</b><span className="xs mut">{e.rentals} completed rentals</span></div>
        <div className="card kpi"><span className="sm mut">Commission</span><b>{inr(e.commission)}</b><span className="xs mut">{launch ? `Launch offer · saves ${inr(e.commissionSaved)}` : `${Math.round(e.commissionRate * 100)}% of rent`}</span></div>
        <div className="card kpi"><span className="sm mut">Damage recovered</span><b>{inr(e.damageRecovered)}</b><span className="xs mut">{e.claimsSettled} settled claim{e.claimsSettled === 1 ? '' : 's'}</span></div>
        <div className="card kpi"><span className="sm mut">Paid out this month</span><b>{inr(e.paidOutThisMonth)}</b><span className="xs mut">Next {inr(e.nextPayout.amount)} on {d(e.nextPayout.on, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
      </div>

      <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }} aria-labelledby="de">
        <h2 id="de" style={{ fontSize: 20 }}>Daily earnings</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140 }} role="img" aria-label="Bar chart of daily earnings">
          {e.daily.map((x) => (
            <div key={x.date} title={`${d(x.date)} · ${inr(x.amount)}`} style={{ flex: 1, height: `${Math.max(2, (x.amount / max) * 100)}%`, background: x.amount ? 'var(--green)' : '#efede7', borderRadius: '3px 3px 0 0' }} />
          ))}
        </div>
        <div className="xs mut" style={{ display: 'flex', justifyContent: 'space-between' }}><span>{d(e.daily[0].date)}</span><span>{d(e.daily.at(-1)!.date)}</span></div>
      </section>

      <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflowX: 'auto' }} aria-labelledby="wp">
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h2 id="wp" style={{ fontSize: 20 }}>Weekly payouts</h2>
          <span className="sm">
            {e.bank ? <>To {e.bank.name ?? 'bank'} ••{e.bank.last4} · </> : <span style={{ color: '#9B1C13' }}>No bank account yet · </span>}
            <button type="button" onClick={() => setBankOpen((o) => !o)} style={{ background: 'none', border: 0, color: 'var(--green)', cursor: 'pointer', padding: 0, fontWeight: 600 }}>{e.bank ? 'Change' : 'Add bank account'}</button>
          </span>
        </div>
        {bankOpen && <BankForm onSaved={() => { setBankOpen(false); reload(); }} />}
        <table className="tbl">
          <thead><tr><th>Week</th><th>Rentals</th><th>Gross</th><th>Commission</th><th>TCS</th><th>Net payout</th><th>Status</th></tr></thead>
          <tbody>
            {e.weeks.map((w) => (
              <tr key={w.weekStart}>
                <td>{d(w.weekStart)}–{d(new Date(new Date(w.weekEnd).getTime() - 86_400_000).toISOString())}</td>
                <td>{w.rentals}</td>
                <td>{inr(w.gross)}</td>
                <td>{inr(w.commission)}</td>
                <td>{inr(w.tcs)}</td>
                <td><strong>{inr(w.net)}</strong></td>
                <td>
                  <span className={`chip ${w.status === 'paid' ? 'ok' : w.status === 'failed' ? 'er' : w.status === 'in_progress' ? '' : 'wa'}`}>
                    {w.status === 'paid' && w.paidAt ? `Paid ${d(w.paidAt)}` : w.status === 'in_progress' ? 'This week' : w.status === 'failed' ? 'Failed' : `Scheduled ${d(w.payOn)}`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
        <section className="card" style={{ flex: '999 1 480px', padding: 20, overflowX: 'auto' }} aria-labelledby="pv">
          <h2 id="pv" style={{ fontSize: 20, marginBottom: 12 }}>Per vehicle</h2>
          <table className="tbl">
            <thead><tr><th>Vehicle</th><th>Days rented</th><th>Utilisation</th><th>Earned</th></tr></thead>
            <tbody>
              {e.perVehicle.map((v) => (
                <tr key={v.vehicleId}>
                  <td><strong>{v.title}</strong><div className="xs mut">{v.registration}</div></td>
                  <td>{v.daysRented} of {v.daysElapsed}</td>
                  <td style={{ minWidth: 120 }}><div className="bar"><i style={{ width: `${Math.round(v.utilisation * 100)}%` }} /></div></td>
                  <td>{inr(v.earned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card" style={{ flex: '1 1 320px', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }} aria-labelledby="gi">
          <h2 id="gi" style={{ fontSize: 20 }}>GST invoices</h2>
          <p className="sm mut">One per booking.{e.gstin ? ` Your GSTIN ${e.gstin}.` : ''}</p>
          {e.invoices.length === 0 && <p className="sm mut">No completed rentals this month.</p>}
          {e.invoices.map((i) => (
            <div key={i.number} className="li">
              <div style={{ flex: 1 }}><strong className="sm">{i.number}</strong><div className="xs mut">{i.title} · {inr(i.amount)}</div></div>
              <Link className="btn bt" style={{ minHeight: 32 }} href={`/invoices/${i.code}`}>View</Link>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function BankForm({ onSaved }: { onSaved: () => void }) {
  const [bank, setBank] = useState('');
  const [acc, setAcc] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [err, setErr] = useState<string | null>(null);
  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    setErr(null);
    try {
      await api('/me/operator/payout', { method: 'PUT', body: { bank, accountNumber: acc, ifsc } });
      onSaved();
    } catch (e) {
      setErr(errorMessage(e));
    }
  }
  return (
    <form onSubmit={(ev) => void save(ev)} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <div><label className="lbl" htmlFor="bn">Bank</label><input id="bn" className="in" value={bank} onChange={(ev) => setBank(ev.target.value)} required /></div>
      <div><label className="lbl" htmlFor="ac">Account number</label><input id="ac" className="in" inputMode="numeric" value={acc} onChange={(ev) => setAcc(ev.target.value.replace(/\D/g, ''))} required /></div>
      <div><label className="lbl" htmlFor="if">IFSC</label><input id="if" className="in" value={ifsc} onChange={(ev) => setIfsc(ev.target.value.toUpperCase())} required /></div>
      <button type="submit" className="btn bp">Save</button>
      {err && <span className="sm" style={{ color: '#9B1C13', width: '100%' }}>{err}</span>}
      <span className="xs mut" style={{ width: '100%' }}>We keep only the last 4 digits of the account number.</span>
    </form>
  );
}
