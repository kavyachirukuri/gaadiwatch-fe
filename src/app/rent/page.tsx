import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RentSearch } from '@/components/rent/RentSearch';

export const metadata: Metadata = {
  title: 'Rent a vehicle · GaadiWatch',
  description: 'Rent scooters, bikes, EVs and cars from licensed operators near you.',
};

export default function RentPage() {
  return (
    <Suspense fallback={<div className="wrap mut">Loading vehicles…</div>}>
      <RentSearch />
    </Suspense>
  );
}
