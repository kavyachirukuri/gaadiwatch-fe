'use client';

import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { inr } from '@/lib/format';

type Invoice = {
  number: string;
  date: string;
  seller: { name: string | null; gstin: string | null; city: string };
  buyer: { name: string | null };
  vehicle: string;
  period: { from: string; to: string };
  lines: { label: string; amount: number }[];
  platformFees: { label: string; amount: number }[];
  deposit: { held: number; refunded: number | null };
};

const dt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function InvoiceView() {
  const { user } = useRequireAuth();
  const { code } = useParams<{ code: string }>();
  const { data, error } = useApi<Invoice>(user ? `/invoices/${code}` : null);
  if (error && !data) return <main className="wrap"><div className="note r">{error}</div></main>;
  if (!data) return <main className="wrap mut">Loading…</main>;
  const total = data.lines.reduce((s, l) => s + l.amount, 0);
  const feeTotal = data.platformFees.reduce((s, l) => s + l.amount, 0);
  return (
    <main className="wrap" style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 28 }}>Invoice {data.number}</h1>
        <button type="button" className="btn bs" onClick={() => window.print()}>Print / save as PDF</button>
      </div>
      <section className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }} className="sm">
          <div><div className="k">From</div><strong>{data.seller.name}</strong>{data.seller.gstin && <div>GSTIN {data.seller.gstin}</div>}</div>
          <div><div className="k">To</div><strong>{data.buyer.name ?? 'Renter'}</strong></div>
          <div><div className="k">Date</div>{dt(data.date)}</div>
        </div>
        <div className="sm">{data.vehicle} · {dt(data.period.from)} → {dt(data.period.to)}</div>
        <table className="tbl">
          <tbody>
            {data.lines.map((l) => <tr key={l.label}><td>{l.label}</td><td style={{ textAlign: 'right' }}>{inr(l.amount)}</td></tr>)}
            <tr><td><strong>Total from operator</strong></td><td style={{ textAlign: 'right' }}><strong>{inr(total)}</strong></td></tr>
          </tbody>
        </table>
        <div className="k">Charged by GaadiWatch</div>
        <table className="tbl">
          <tbody>
            {data.platformFees.map((l) => <tr key={l.label}><td>{l.label}</td><td style={{ textAlign: 'right' }}>{inr(l.amount)}</td></tr>)}
            <tr><td><strong>Total platform fees</strong></td><td style={{ textAlign: 'right' }}><strong>{inr(feeTotal)}</strong></td></tr>
          </tbody>
        </table>
        <p className="xs mut">Refundable deposit {inr(data.deposit.held)} held by GaadiWatch{data.deposit.refunded !== null ? `; ${inr(data.deposit.refunded)} refunded` : ''}. Not part of the invoice value.</p>
      </section>
    </main>
  );
}
