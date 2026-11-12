'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useApi } from '@/lib/use-api';
import { inr } from '@/lib/format';

type Overview = {
  range: string;
  kpis: {
    completedRentals: number;
    completedChange: number | null;
    activeListings: number;
    activeListingsByCity: Record<string, number>;
    acceptance: number | null;
    medianReplyMinutes: number | null;
    gbv: number;
    claimRate: number | null;
    claims: number;
    trackingOn: number | null;
    saleOffersIn14Days: number | null;
    ownersRebooked: number | null;
  };
  cities: { key: string; name: string }[];
  weekly: Record<string, number | string>[];
  queues: { listings: number; oldestListingHours: number | null; kyc: number; disputes: number; disputesPastSla: number; reports: number; sos: number };
  byCity: { key: string; name: string; activeListings: number; rentals: number; acceptance: number | null; gbv: number; claimRate: number | null; trackingOn: number | null }[];
};

const pct = (v: number | null, digits = 0) => (v === null ? '—' : `${(v * 100).toFixed(digits)}%`);
const lakh = (n: number) => (n >= 1_00_000 ? `₹${(n / 1_00_000).toFixed(1)} L` : inr(n));
const RANGES = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '6m', label: '6 months' },
] as const;
const COLORS = ['#0B6E5A', '#1D5FD1', '#B86E00', '#8A1910'];

export function AdminDashboard() {
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('30d');
  const { data, error } = useApi<Overview>(`/admin/overview?range=${range}`, { staff: true });
  if (error && !data) return <div className="note r">{error}</div>;
  if (!data) return <p className="mut">Loading…</p>;
  const k = data.kpis;
  const max = Math.max(1, ...data.weekly.flatMap((w) => data.cities.map((c) => Number(w[c.key] ?? 0))));

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 30 }}>Marketplace health</h1>
        <div className="seg">
          {RANGES.map((r) => <button key={r.key} type="button" className={range === r.key ? 'on' : ''} onClick={() => setRange(r.key)}>{r.label}</button>)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <Kpi label="Completed rentals" value={k.completedRentals.toLocaleString('en-IN')} sub={`North star${k.completedChange !== null ? ` · ${k.completedChange >= 0 ? '+' : ''}${Math.round(k.completedChange * 100)}% vs previous` : ''}`} />
        <Kpi label="Active listings" value={k.activeListings.toLocaleString('en-IN')} sub={data.cities.map((c) => `${c.name.slice(0, 3)} ${k.activeListingsByCity[c.key] ?? 0}`).join(' · ')} />
        <Kpi label="Requests accepted" value={pct(k.acceptance)} sub={k.medianReplyMinutes !== null ? `Median reply ${k.medianReplyMinutes} min` : ''} />
        <Kpi label="Gross booking value" value={lakh(k.gbv)} sub="In this period" />
        <Kpi label="Claim rate" value={pct(k.claimRate, 1)} sub={`${k.claims} damage / dispute claims`} />
        <Kpi label="Tracking on" value={pct(k.trackingOn)} sub="of rental listings" />
        <Kpi label="Sale offers in 14 days" value={pct(k.saleOffersIn14Days)} sub="of sale listings" />
        <Kpi label="Owners rebooked in 30 days" value={pct(k.ownersRebooked)} sub="retention" />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <section className="card" style={{ flex: '999 1 480px', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }} aria-labelledby="wk">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h2 id="wk" style={{ fontSize: 20 }}>Completed rentals per week</h2>
            <div className="sm" style={{ display: 'flex', gap: 12 }}>
              {data.cities.map((c, i) => <span key={c.key}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], marginRight: 4 }} />{c.name}</span>)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180 }} role="img" aria-label="Weekly completed rentals by city">
            {data.weekly.map((w) => (
              <div key={String(w.week)} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%' }} title={new Date(String(w.week)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}>
                {data.cities.map((c, i) => (
                  <div key={c.key} title={`${c.name}: ${w[c.key]}`} style={{ flex: 1, height: `${Math.max(1, (Number(w[c.key] ?? 0) / max) * 100)}%`, background: COLORS[i % COLORS.length], borderRadius: '3px 3px 0 0' }} />
                ))}
              </div>
            ))}
          </div>
          <div className="xs mut" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{new Date(String(data.weekly[0]?.week)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            <span>{new Date(String(data.weekly.at(-1)?.week)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
        </section>
        <section className="card" style={{ flex: '1 1 300px', padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }} aria-labelledby="qu">
          <h2 id="qu" style={{ fontSize: 20 }}>Queues</h2>
          <Queue href="/admin/review" label="Listings to review" value={`${data.queues.listings}${data.queues.oldestListingHours !== null ? ` · oldest ${data.queues.oldestListingHours} h` : ''}`} warn={data.queues.listings > 0} />
          <Queue href="/admin/review?tab=people" label="KYC & licences" value={String(data.queues.kyc)} warn={data.queues.kyc > 0} />
          <Queue href="/admin/ops" label="Open disputes" value={`${data.queues.disputes}${data.queues.disputesPastSla ? ` · ${data.queues.disputesPastSla} past SLA` : ''}`} warn={data.queues.disputesPastSla > 0} />
          <Queue href="/admin/ops?tab=reports" label="Reported listings" value={String(data.queues.reports)} warn={data.queues.reports > 0} />
          <Queue href="/admin/ops?tab=sos" label="Active SOS" value={String(data.queues.sos)} warn={data.queues.sos > 0} />
        </section>
      </div>

      <section className="card" style={{ padding: 20, overflowX: 'auto' }} aria-labelledby="bc">
        <h2 id="bc" style={{ fontSize: 20, marginBottom: 12 }}>By city</h2>
        <table className="tbl">
          <thead><tr><th>City</th><th>Active listings</th><th>Rentals</th><th>Acceptance</th><th>GBV</th><th>Claims</th><th>Tracking on</th></tr></thead>
          <tbody>
            {data.byCity.map((c) => (
              <tr key={c.key}>
                <td><strong>{c.name}</strong></td>
                <td>{c.activeListings}</td>
                <td>{c.rentals}</td>
                <td>{pct(c.acceptance)}</td>
                <td>{lakh(c.gbv)}</td>
                <td>{pct(c.claimRate, 1)}</td>
                <td>{pct(c.trackingOn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card kpi">
      <span className="sm mut">{label}</span>
      <b>{value}</b>
      <span className="xs mut">{sub}</span>
    </div>
  );
}

function Queue({ href, label, value, warn }: { href: string; label: string; value: string; warn: boolean }) {
  return (
    <Link href={href} className="li" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
      <span style={{ flex: 1 }}>{label}</span>
      <span className={`chip ${warn ? 'wa' : ''}`}>{value}</span>
    </Link>
  );
}
