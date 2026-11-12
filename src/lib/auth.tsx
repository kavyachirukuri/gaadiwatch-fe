'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { API_URL } from './api';
import { tenantHeaders } from './tenant';

// ---------- API calls that may need the login token ----------

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const TOKEN_KEY = 'gw_token';
export const STAFF_TOKEN_KEY = 'gw_staff_token'; // admin panel keeps its own session

export function readToken(key = TOKEN_KEY): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeToken(token: string | null, key = TOKEN_KEY) {
  try {
    if (token) localStorage.setItem(key, token);
    else localStorage.removeItem(key);
  } catch {
    // storage blocked (private mode) — the user just stays logged out after a reload
  }
}

export type ApiInit = { method?: string; body?: unknown; signal?: AbortSignal; staff?: boolean };

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const token = readToken(init.staff ? STAFF_TOKEN_KEY : TOKEN_KEY);
  const res = await fetch(`${API_URL}${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    signal: init.signal,
    headers: {
      Accept: 'application/json',
      ...tenantHeaders(),
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join('. ') : data?.message;
    throw new ApiError(res.status, msg ?? `Something went wrong (${res.status})`);
  }
  return data as T;
}

function errorText(data: { message?: string | string[] } | null, status: number) {
  const msg = Array.isArray(data?.message) ? data.message.join('. ') : data?.message;
  return msg ?? `Something went wrong (${status})`;
}

/** Uploads a photo or PDF; returns its public URL. */
export async function uploadFile(file: File, staff = false): Promise<string> {
  const token = readToken(staff ? STAFF_TOKEN_KEY : TOKEN_KEY);
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/uploads`, { method: 'POST', body: form, headers: { ...tenantHeaders(), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const data = (await res.json().catch(() => null)) as ({ url?: string; message?: string | string[] }) | null;
  if (!res.ok || !data?.url) throw new ApiError(res.status, errorText(data, res.status));
  return data.url;
}

/** Downloads a file from a logged-in endpoint (e.g. a CSV statement). */
export async function downloadFile(path: string, filename: string) {
  const token = readToken();
  const res = await fetch(`${API_URL}${path}`, { headers: { ...tenantHeaders(), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!res.ok) throw new ApiError(res.status, `Download failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const errorMessage = (e: unknown, fallback = 'Something went wrong. Try again.') => (e instanceof ApiError ? e.message : fallback);

// ---------- The logged-in user ----------

export type Me = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'support' | 'admin';
  kycStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
  aadhaarLast4: string | null;
  licenceStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
  licenceClasses: string[];
  vehicleCount: number;
  operator: null | {
    businessName: string;
    city: string;
    status: 'not_started' | 'pending' | 'verified' | 'rejected';
    gstin: string | null;
    rentalLicenceNo: string | null;
  };
  createdAt: string;
};

type AuthState = {
  user: Me | null;
  ready: boolean; // false until we know whether someone is logged in
  signIn: (token: string) => Promise<Me>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: Me) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!readToken()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      setUser(await api<Me>('/me'));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) writeToken(null);
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // Load the session once when the app starts (async, so no state is set during render)
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  const signIn = useCallback(async (token: string) => {
    writeToken(token);
    const me = await api<Me>('/me');
    setUser(me);
    setReady(true);
    return me;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // already logged out on the server — fine
    }
    writeToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, signIn, signOut, refresh, setUser }), [user, ready, signIn, signOut, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Sends people who aren't logged in to /login, then back here afterwards. */
export function useRequireAuth(): { user: Me | null; ready: boolean } {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) {
      const next = `${pathname}${typeof window !== 'undefined' ? window.location.search : ''}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [ready, user, router, pathname]);

  return { user, ready };
}
