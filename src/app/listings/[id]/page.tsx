import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ListingView } from '@/components/listing/ListingView';

export const metadata: Metadata = {
  title: 'Vehicle details · GaadiWatch',
};

export default function ListingPage() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading vehicle…</main>}>
      <ListingView />
    </Suspense>
  );
}
