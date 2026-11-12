'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, ApiError, readToken, STAFF_TOKEN_KEY, writeToken } from '@/lib/auth';
import { Logo } from '@/components/Logo';

export type Staff = { id: string; name: string | null; email: string | null; role: 'support' | 'admin' };
const StaffContext = createContext<Staff | null>(null);
export const useStaff = () => useContext(StaffContext)!;

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/review', label: 'Review queue' },
  { href: '/admin/ops', label: 'Disputes & users' },
  { href: '/admin/settings', label: 'Fees & settings' },
];

/** Admin pages: staff sign-in check plus the side navigation. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [staff, setStaff] = useState<Staff | null>(null);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      if (!readToken(STAFF_TOKEN_KEY)) {
        router.replace('/admin/login');
        return;
      }
      api<Staff>('/admin/me', { staff: true })
        .then((s) => live && setStaff(s))
        .catch((e: unknown) => {
          if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
            writeToken(null, STAFF_TOKEN_KEY);
            router.replace('/admin/login');
          }
        });
    }, 0);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [router]);

  if (!staff) return <main className="wrap mut">Checking your staff session…</main>;

  return (
    <StaffContext.Provider value={staff}>
      <header className="nav" style={{ background: 'var(--ink)', color: '#fff' }}>
        <Logo />
        <strong style={{ color: '#fff' }}>Admin</strong>
        <span style={{ flex: 1 }} />
        <span className="sm" style={{ color: '#ddd' }}>{staff.name ?? staff.email} · {staff.role === 'admin' ? 'Admin' : 'Support agent'}</span>
        <button
          type="button"
          className="btn bs"
          onClick={async () => {
            try {
              await api('/auth/logout', { method: 'POST', staff: true });
            } catch {
              // already signed out
            }
            writeToken(null, STAFF_TOKEN_KEY);
            router.replace('/admin/login');
          }}
        >
          Sign out
        </button>
      </header>
      <div className="wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <nav className="side" aria-label="Admin">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={pathname === n.href ? 'cur' : ''}>{n.label}</Link>
          ))}
          {staff.role !== 'admin' && <p className="xs mut" style={{ padding: 12 }}>Support agents can view bookings, resolve disputes and refund deposits. Admins can also approve listings and KYC, ban users and change fees.</p>}
        </nav>
        <div className="main">{children}</div>
      </div>
    </StaffContext.Provider>
  );
}
