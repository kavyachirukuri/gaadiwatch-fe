'use client';

import Link from 'next/link';
import { useMeta } from '@/lib/use-meta';

/** "Every vehicle type, one place" — categories come from the database (GET /meta). */
export function VehicleTypes() {
  const { meta } = useMeta();
  const categories = meta?.vehicleCategories ?? [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
      {categories.map((c) => (
        <Link
          key={c.key}
          className="card"
          href={c.rent ? `/rent?type=${c.key}` : `/buy?type=${c.key}`}
          style={{ padding: 16, textDecoration: 'none', color: 'var(--ink)' }}
        >
          <strong>{c.label}</strong>
          <div className="sm mut">{[c.rent && 'Rent', c.buy && 'Buy'].filter(Boolean).join(' · ')}</div>
        </Link>
      ))}
      {!meta && [0, 1, 2, 3].map((i) => <div key={i} className="card" style={{ height: 62 }} aria-hidden="true" />)}
    </div>
  );
}
