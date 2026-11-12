import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TripsView } from '@/components/booking/TripsView';

export const metadata: Metadata = { title: 'My trips · GaadiWatch' };

export default function TripsPage() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <TripsView />
    </Suspense>
  );
}
