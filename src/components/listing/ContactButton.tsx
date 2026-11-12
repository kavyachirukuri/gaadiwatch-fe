'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage, useAuth } from '@/lib/auth';

/** Opens (or reuses) a chat about this listing; logged-out visitors go to log in first. */
export function ContactButton({
  listingId,
  action,
  className = 'btn bs',
  children,
}: {
  listingId: string;
  action?: 'offer' | 'ride';
  className?: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const { id } = await api<{ id: string }>('/conversations', { body: { listingId } });
      router.push(`/messages?c=${id}${action ? `&action=${action}` : ''}`);
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={className} disabled={busy} onClick={() => void go()}>
        {children}
      </button>
      {err && <span className="xs" style={{ color: '#9B1C13' }}>{err}</span>}
    </>
  );
}
