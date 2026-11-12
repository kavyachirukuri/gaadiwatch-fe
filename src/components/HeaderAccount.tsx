'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';

function initials(name: string | null, phone: string) {
  if (!name) return phone.slice(-2);
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

/** Right side of the header: Log in / Sign up, or the logged-in user's links and menu. */
export function HeaderAccount() {
  const { user, ready, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const unread = useApi<{ unread: number }>(user ? '/me/notifications/unread' : null, { pollMs: 60_000 });

  if (!ready) return <span style={{ width: 160 }} aria-hidden="true" />;

  if (!user) {
    return (
      <>
        <Link className="btn bt" href="/login">Log in</Link>
        <Link className="btn bp" href="/login">Sign up</Link>
      </>
    );
  }

  const item = { padding: '10px', color: 'var(--ink)', textDecoration: 'none' } as const;
  const count = unread.data?.unread ?? 0;
  return (
    <>
      <Link href="/trips" style={{ color: 'var(--ink)', textDecoration: 'none', fontWeight: 500 }}>My trips</Link>
      <Link href="/messages" style={{ color: 'var(--ink)', textDecoration: 'none', fontWeight: 500 }}>Messages</Link>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className="av"
          style={{ border: 0, cursor: 'pointer' }}
          aria-label={`Account menu${count ? `, ${count} unread notifications` : ''}`}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {initials(user.name, user.phone)}
        </button>
        {count > 0 && (
          <span aria-hidden="true" style={{ position: 'absolute', top: -4, right: -4, background: '#B42318', color: '#fff', borderRadius: 999, font: '700 11px var(--font-body)', padding: '2px 6px' }}>{count > 9 ? '9+' : count}</span>
        )}
        {open && (
          <div
            className="card"
            role="menu"
            style={{ position: 'absolute', right: 0, top: 48, minWidth: 230, padding: 8, display: 'flex', flexDirection: 'column', zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}
          >
            <div style={{ padding: '8px 10px' }}>
              <strong>{user.name ?? 'Your account'}</strong>
              <div className="sm mut">{user.phone}</div>
            </div>
            <hr className="hr" />
            <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} style={item}>Profile &amp; notifications{count ? ` (${count})` : ''}</Link>
            <Link role="menuitem" href="/verify" onClick={() => setOpen(false)} style={item}>Verification</Link>
            <Link role="menuitem" href="/trips" onClick={() => setOpen(false)} style={item}>My trips</Link>
            <Link role="menuitem" href="/messages" onClick={() => setOpen(false)} style={item}>Messages</Link>
            <Link role="menuitem" href="/operator" onClick={() => setOpen(false)} style={item}>Owner dashboard</Link>
            {user.operator?.status === 'verified' && (
              <>
                <Link role="menuitem" href="/operator/requests" onClick={() => setOpen(false)} style={item}>Booking requests</Link>
                <Link role="menuitem" href="/operator/fleet" onClick={() => setOpen(false)} style={item}>Fleet tracking</Link>
                <Link role="menuitem" href="/operator/earnings" onClick={() => setOpen(false)} style={item}>Earnings &amp; payouts</Link>
              </>
            )}
            <Link role="menuitem" href="/help" onClick={() => setOpen(false)} style={item}>Help &amp; safety</Link>
            <hr className="hr" />
            <button
              role="menuitem"
              type="button"
              className="btn bt"
              style={{ justifyContent: 'flex-start', padding: '0 10px', color: '#9B1C13' }}
              onClick={async () => {
                setOpen(false);
                await signOut();
                router.push('/');
              }}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </>
  );
}
