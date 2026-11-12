'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api, errorMessage, useAuth } from '@/lib/auth';

/** Saves the current Rent/Buy search so new matching listings can be sent as alerts. */
export function SaveSearchButton({ mode, label, className = 'btn bs', text = 'Save search' }: { mode: 'rent' | 'buy'; label: string; className?: string; text?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [state, setState] = useState<'idle' | 'busy' | 'saved'>('idle');
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const query = params.toString();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`${pathname}${query ? `?${query}` : ''}`)}`);
      return;
    }
    setState('busy');
    setErr(null);
    try {
      await api('/me/saved-searches', { body: { mode, label, query: query || 'all=1' } });
      setState('saved');
    } catch (e) {
      setErr(errorMessage(e));
      setState('idle');
    }
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button type="button" className={className} disabled={state !== 'idle'} onClick={() => void save()}>
        {state === 'saved' ? 'Saved ✓' : state === 'busy' ? 'Saving…' : text}
      </button>
      {err && <span className="xs" style={{ color: '#9B1C13' }}>{err}</span>}
    </span>
  );
}
