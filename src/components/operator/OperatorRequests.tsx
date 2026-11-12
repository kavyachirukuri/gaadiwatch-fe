'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, useRequireAuth } from '@/lib/auth';
import type { Booking, BookingStatus } from '@/lib/bookings-api';
import { RequestCard } from './RequestCard';

const FILTERS: { key: BookingStatus | 'all'; label: string }[] = [
  { key: 'requested', label: 'Requests' },
  { key: 'accepted', label: 'Confirmed' },
  { key: 'active', label: 'On trip' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
];

export function OperatorRequests() {
  const { user, ready } = useRequireAuth();
  const [filter, setFilter] = useState<BookingStatus | 'all'>('requested');
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const path = `/operator/bookings${filter === 'all' ? '' : `?status=${filter}`}`;
  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not load bookings');

  const load = useCallback(async () => {
    try {
      setRows(await api<Booking[]>(path));
    } catch (e) {
      fail(e);
    }
  }, [path]);

  const verified = user?.operator?.status === 'verified';
  useEffect(() => {
    if (!verified) return;
    let live = true;
    api<Booking[]>(path)
      .then((r) => live && setRows(r))
      .catch((e: unknown) => live && fail(e));
    return () => { live = false; };
  }, [verified, path]);

  if (!ready || !user) return <main className="wrap mut">Loading…</main>;
  if (user.operator?.status !== 'verified') {
    return (
      <main className="wrap">
        <div className="note w"><span>Only verified rental operators can see booking requests. <Link href="/operator">Learn more</Link></span></div>
      </main>
    );
  }

  return (
    <main className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 }}>
      <div>
        <Link href="/operator" className="sm">← Dashboard</Link>
        <h1 style={{ fontSize: 32 }}>Bookings</h1>
      </div>
      <div className="seg" role="tablist" aria-label="Filter bookings" style={{ flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button key={f.key} role="tab" aria-selected={filter === f.key} className={filter === f.key ? 'on' : ''} onClick={() => { setRows(null); setFilter(f.key); }}>
            {f.label}
          </button>
        ))}
      </div>
      {error && <div className="note r" role="alert">{error}</div>}
      {rows === null ? (
        <p className="mut">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding: 24 }}><p className="mut">Nothing here.</p></div>
      ) : (
        rows.map((b) => <RequestCard key={b.id} booking={b} onChange={load} />)
      )}
    </main>
  );
}
