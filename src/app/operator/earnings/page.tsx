import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EarningsView } from '@/components/operator/EarningsView';

export const metadata: Metadata = { title: 'Earnings & payouts · GaadiWatch' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <EarningsView />
    </Suspense>
  );
}
