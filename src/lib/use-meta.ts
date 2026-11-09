'use client';

import { useEffect, useState } from 'react';
import { getMeta, type Meta } from './listings-api';

// Platform settings change rarely, so every component shares one request.
let cached: Promise<Meta> | null = null;

export function useMeta(): { meta: Meta | null; error: string | null } {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!cached) {
      cached = getMeta().catch((e: Error) => {
        cached = null; // allow a retry on the next mount
        throw e;
      });
    }
    cached
      .then((m) => alive && setMeta(m))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  return { meta, error };
}

/** Options for a vehicle-type <select>, from the categories stored in the database. */
export function typeOptions(meta: Meta | null, mode: 'rent' | 'buy') {
  return (meta?.vehicleCategories ?? []).filter((c) => (mode === 'rent' ? c.rent : c.buy));
}
