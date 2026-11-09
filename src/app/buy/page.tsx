import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BuySearch } from '@/components/buy/BuySearch';

export const metadata: Metadata = {
  title: 'Buy a vehicle · GaadiWatch',
  description: 'RC-checked used scooters, bikes, cars, 3-wheelers, trucks and lorries for sale near you.',
};

export default function BuyPage() {
  return (
    <Suspense fallback={<div className="wrap mut">Loading vehicles…</div>}>
      <BuySearch />
    </Suspense>
  );
}
