import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OperatorDashboard } from '@/components/operator/OperatorDashboard';

export const metadata: Metadata = { title: 'Owner dashboard · GaadiWatch' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <OperatorDashboard />
    </Suspense>
  );
}
