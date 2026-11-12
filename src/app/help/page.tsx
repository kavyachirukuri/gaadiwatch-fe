import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HelpCenter } from '@/components/help/HelpCenter';

export const metadata: Metadata = { title: 'Help & safety · GaadiWatch' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <HelpCenter />
    </Suspense>
  );
}
