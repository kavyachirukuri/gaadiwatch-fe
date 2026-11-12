'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth, type Me } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { inr } from '@/lib/format';
import { TRACKING_LABEL } from '@/lib/listings-api';
import { timeLeft, type Booking, type OperatorSummary } from '@/lib/bookings-api';
import { RequestCard } from './RequestCard';

type OwnerListing = {
  id: string;
  title: string;
  year: number;
  registration: string;
  purpose: 'rent' | 'sell' | 'both';
  status: 'draft' | 'in_review' | 'live' | 'paused' | 'sold' | 'rejected' | 'changes_needed';
  reviewNote: string | null;
  trackingSource: keyof typeof TRACKING_LABEL;
  onTrip: boolean;
  bookedDaysThisMonth: number;
  earnedThisMonth: number;
  pendingOffers: number;
  views: number;
  sold: { finalPrice: number | null; soldAt: string | null } | null;
};
type EarningsLite = { launchOfferEndsAt: string | null; weeks: { net: number; status: string }[]; nextPayout: { amount: number; on: string }; bank: { name: string | null; last4: string } | null };
type FleetLite = { alerts: { id: string; type: string; message: string; createdAt: string; resolvedAt: string | null }[] };

const STATUS: Record<OwnerListing['status'], [string, string]> = {
  draft: ['', 'Draft'],
  in_review: ['wa', 'In review'],
  live: ['ok', 'Live'],
  paused: ['', 'Paused'],
  sold: ['', 'Sold'],
  rejected: ['er', 'Not approved'],
  changes_needed: ['er', 'Changes needed'],
};
const FILTERS = ['all', 'rent', 'sale', 'action'] as const;

export function OperatorDashboard() {
  const { user } = useRequireAuth();
  if (!user) return <main className="wrap mut">Loading…</main>;
  return <Dashboard user={user} />;
}

function Dashboard({ user }: { user: Me }) {
  const listedFlag = useSearchParams().get('listed');
  const isOperator = user.operator?.status === 'verified';
  const listings = useApi<OwnerListing[]>('/me/listings');
  const summary = useApi<OperatorSummary>(isOperator ? '/operator/summary' : null);
  const requests = useApi<Booking[]>(isOperator ? '/operator/bookings?status=requested' : null, { pollMs: 30_000 });
  const confirmed = useApi<Booking[]>(isOperator ? '/operator/bookings' : null);
  const earnings = useApi<EarningsLite>(isOperator ? '/operator/earnings' : null);
  const fleet = useApi<FleetLite>(isOperator ? '/operator/fleet' : null, { pollMs: 60_000 });
  const [now] = useState(() => Date.now());
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = user.operator?.businessName ?? user.name ?? 'there';
  const launch = earnings.data?.launchOfferEndsAt && new Date(earnings.data.launchOfferEndsAt).getTime() > now ? earnings.data.launchOfferEndsAt : null;
  const oldest = requests.data?.map((b) => b.replyBy).filter(Boolean).sort()[0] ?? null;
  const vehicles = summary.data?.vehicles ?? 0;

  const todayStr = new Date(now).toDateString();
  const pickups = (confirmed.data ?? []).filter((b) => ['accepted', 'paid'].includes(b.status) && new Date(b.startAt).toDateString() === todayStr);
  const returns = (confirmed.data ?? []).filter((b) => b.status === 'active' && new Date(b.endAt).toDateString() === todayStr);
  const t = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  const rows = (listings.data ?? []).filter((l) =>
    filter === 'all' ? true : filter === 'rent' ? l.purpose !== 'sell' : filter === 'sale' ? l.purpose !== 'rent' : ['draft', 'changes_needed', 'rejected'].includes(l.status),
  );

  return (
    <main className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 32 }}>{greeting}, {name}</h1>
          {launch && <span className="chip ok">Zero commission until {new Date(launch).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · launch offer</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isOperator && <Link className="btn bs" href="/operator/fleet">Fleet map</Link>}
          {isOperator && <Link className="btn bs" href="/operator/earnings">Earnings</Link>}
          <Link className="btn bp" href="/list-vehicle">List a vehicle</Link>
        </div>
      </div>

      {listedFlag && <div className="note g" role="status"><span>Listing saved. If it needs review, our team usually checks it within 24 hours.</span></div>}

      {!isOperator && (
        <div className="note">
          <span>
            {user.operator?.status === 'pending'
              ? `Your operator profile (${user.operator.businessName}) is in review. Meanwhile you can list vehicles for sale.`
              : 'Run a licensed rental business? Register as an operator to rent out commercial vehicles. Anyone can list a vehicle for sale.'}{' '}
            {user.operator?.status !== 'pending' && <Link href="/verify?next=/operator">Register as operator</Link>}
          </span>
        </div>
      )}

      {isOperator && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Link href="/operator/requests" className="card kpi" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="sm mut">Pending requests</span>
            <b>{summary.data?.pendingRequests ?? '—'}</b>
            <span className="xs mut">{oldest ? `Oldest expires in ${timeLeft(oldest, now)}` : 'Nothing waiting'}</span>
          </Link>
          <div className="card kpi">
            <span className="sm mut">On trip now</span>
            <b>{summary.data ? `${summary.data.activeTrips} of ${vehicles}` : '—'}</b>
            <span className="xs mut">{vehicles ? `${Math.round(((summary.data?.activeTrips ?? 0) / vehicles) * 100)}% utilisation today` : ''}</span>
          </div>
          <div className="card kpi">
            <span className="sm mut">This week&apos;s earnings</span>
            <b>{earnings.data ? inr(earnings.data.weeks[0]?.net ?? 0) : '—'}</b>
            <span className="xs mut">after commission</span>
          </div>
          <Link href="/operator/earnings" className="card kpi" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="sm mut">Next payout</span>
            <b>{earnings.data ? new Date(earnings.data.nextPayout.on).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}</b>
            <span className="xs mut">{earnings.data ? `${inr(earnings.data.nextPayout.amount)}${earnings.data.bank ? ` to ${earnings.data.bank.name ?? 'bank'} ••${earnings.data.bank.last4}` : ' · add a bank account'}` : ''}</span>
          </Link>
        </div>
      )}

      {isOperator && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
          <section style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }} aria-labelledby="rq">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 id="rq" style={{ fontSize: 22 }}>Booking requests</h2>
              <Link href="/operator/requests" className="sm">All requests →</Link>
            </div>
            {requests.data === null ? (
              <p className="mut">Loading…</p>
            ) : requests.data.length === 0 ? (
              <div className="card" style={{ padding: 20 }}><p className="mut sm">No requests right now.</p></div>
            ) : (
              requests.data.slice(0, 3).map((b) => <RequestCard key={b.id} booking={b} onChange={async () => { requests.reload(); summary.reload(); }} />)
            )}
            {(pickups.length > 0 || returns.length > 0) && (
              <div className="note">
                <span>
                  Today: {pickups.length} pick-up{pickups.length === 1 ? '' : 's'}{pickups.length ? ` (${pickups.map((b) => t(b.startAt)).join(', ')})` : ''} and {returns.length} return{returns.length === 1 ? '' : 's'}. Do the{' '}
                  <Link href={`/trips/${(pickups[0] ?? returns[0]).id}/checklist`}>hand-over checklist</Link> with each renter.
                </span>
              </div>
            )}
          </section>
          <section className="card" style={{ flex: '1 1 320px', padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }} aria-labelledby="ta">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 id="ta" style={{ fontSize: 18 }}>Tracking alerts</h2>
              <Link href="/operator/fleet" className="sm">Open map</Link>
            </div>
            {(fleet.data?.alerts ?? []).filter((a) => !a.resolvedAt).slice(0, 4).map((a) => (
              <div key={a.id} className="sm" style={{ display: 'flex', gap: 8 }}>
                <span className={`chip ${a.type === 'late' ? 'wa' : 'er'}`}>{a.type}</span>
                <span>{a.message} <span className="mut">· {t(a.createdAt)}</span></span>
              </div>
            ))}
            {fleet.data && fleet.data.alerts.filter((a) => !a.resolvedAt).length === 0 && <p className="sm mut">All quiet.</p>}
          </section>
        </div>
      )}

      <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflowX: 'auto' }} aria-labelledby="yl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2 id="yl" style={{ fontSize: 22 }}>Your listings</h2>
          <div className="seg">
            {FILTERS.map((f) => (
              <button key={f} type="button" className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                {f === 'all' ? `All ${listings.data?.length ?? ''}` : f === 'rent' ? 'Rent' : f === 'sale' ? 'Sale' : 'Needs action'}
              </button>
            ))}
          </div>
        </div>
        {listings.data === null ? (
          <p className="mut">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="sm mut">No listings here. <Link href="/list-vehicle">List a vehicle</Link></p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Vehicle</th><th>Mode</th><th>Status</th><th>Tracking</th><th>This month</th><th /></tr></thead>
            <tbody>
              {rows.map((l) => {
                const [cls, label] = l.onTrip ? (['tr', 'On trip'] as const) : STATUS[l.status];
                return (
                  <tr key={l.id}>
                    <td><strong>{l.title} {l.year}</strong><div className="xs mut">{l.registration}</div></td>
                    <td>{l.purpose === 'both' ? 'Rent + sale' : l.purpose === 'rent' ? 'Rent' : 'Sale'}</td>
                    <td>
                      <span className={`chip ${cls}`}>{label}</span>
                      {l.reviewNote && ['changes_needed', 'rejected'].includes(l.status) && <div className="xs mut" style={{ maxWidth: 240 }}>{l.reviewNote}</div>}
                    </td>
                    <td>{l.purpose === 'sell' ? '—' : TRACKING_LABEL[l.trackingSource] ?? '—'}</td>
                    <td className="sm">
                      {l.status === 'sold' && l.sold
                        ? `${l.sold.finalPrice ? inr(l.sold.finalPrice) : 'Sold'}${l.sold.soldAt ? ` · ${new Date(l.sold.soldAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}`
                        : l.purpose === 'sell'
                          ? `${l.pendingOffers} offer${l.pendingOffers === 1 ? '' : 's'} · ${l.views} views`
                          : `${l.bookedDaysThisMonth} days booked · ${inr(l.earnedThisMonth)}`}
                    </td>
                    <td>
                      {l.onTrip ? (
                        <Link href="/operator/fleet">Track</Link>
                      ) : l.purpose === 'sell' && l.pendingOffers > 0 ? (
                        <Link href="/messages?filter=selling">Offers</Link>
                      ) : l.status !== 'sold' ? (
                        <Link href={`/list-vehicle?id=${l.id}`}>{['changes_needed', 'rejected'].includes(l.status) ? 'Fix' : 'Edit'}</Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
