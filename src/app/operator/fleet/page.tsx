import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FleetView } from '@/components/operator/FleetView';

export const metadata: Metadata = { title: 'Fleet tracking · GaadiWatch' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <FleetView />
    </Suspense>
  );
}
