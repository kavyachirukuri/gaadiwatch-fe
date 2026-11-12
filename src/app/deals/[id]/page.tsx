import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DealView } from '@/components/chat/DealView';

export const metadata: Metadata = { title: 'Close the sale · GaadiWatch' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <DealView />
    </Suspense>
  );
}
