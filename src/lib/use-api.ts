'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from './auth';

/**
 * Loads `path` from the backend (with the login token). Pass null to wait.
 * `reload()` fetches again; `setData()` replaces the data with a fresh server response.
 */
export function useApi<T>(path: string | null, opts: { staff?: boolean; pollMs?: number } = {}) {
  const [state, setState] = useState<{ path: string | null; data: T | null; error: string | null }>({ path: null, data: null, error: null });
  const [tick, setTick] = useState(0);
  const { staff, pollMs } = opts;

  useEffect(() => {
    if (!path) return;
    let live = true;
    api<T>(path, { staff })
      .then((data) => live && setState({ path, data, error: null }))
      .catch((e: unknown) => live && setState((s) => ({ path, data: s.path === path ? s.data : null, error: errorMessage(e) })));
    return () => {
      live = false;
    };
  }, [path, tick, staff]);

  useEffect(() => {
    if (!path || !pollMs) return;
    const t = setInterval(() => setTick((n) => n + 1), pollMs);
    return () => clearInterval(t);
  }, [path, pollMs]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  const setData = useCallback((data: T) => setState({ path, data, error: null }), [path]);
  const same = state.path === path;
  return { data: same ? state.data : null, error: same ? state.error : null, loading: !same, reload, setData };
}
