'use client';

import { useRouter } from 'next/navigation';
import { useMeta } from '@/lib/use-meta';

/** City switcher in the header — cities come from the database. */
export function CityPicker() {
  const router = useRouter();
  const { meta } = useMeta();
  if (!meta || meta.cities.length === 0) return null;

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="sr-only">City</span>
      <select
        className="in"
        style={{ minHeight: 40, width: 'auto', fontWeight: 600 }}
        defaultValue=""
        onChange={(e) => e.target.value && router.push(`/rent?location=${encodeURIComponent(e.target.value)}`)}
      >
        <option value="" disabled>Choose city</option>
        {meta.cities.map((c) => <option key={c.key} value={c.name}>{c.name}</option>)}
      </select>
    </label>
  );
}
