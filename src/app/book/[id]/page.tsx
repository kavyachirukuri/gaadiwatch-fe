import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BookingCheckout } from '@/components/booking/BookingCheckout';

export const metadata: Metadata = { title: 'Request to book · GaadiWatch' };

export default function BookPage() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <BookingCheckout />
    </Suspense>
  );
}
