'use client';

import { useMeta } from '@/lib/use-meta';

/** "Now live in Hyderabad & Bengaluru" — cities come from the database. */
export function LiveCities() {
  const { meta } = useMeta();
  const names = meta?.cities.map((c) => c.name) ?? [];
  const text = names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : names[0];

  return (
    <span className="chip" style={{ background: '#1E4B40', color: '#CDEBE1', alignSelf: 'flex-start', minHeight: 26 }}>
      {text ? `Now live in ${text}` : ' '}
    </span>
  );
}
