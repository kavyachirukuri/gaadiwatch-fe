import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ListVehicleForm } from '@/components/owner/ListVehicleForm';

export const metadata: Metadata = { title: 'List a vehicle · GaadiWatch' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <ListVehicleForm />
    </Suspense>
  );
}
