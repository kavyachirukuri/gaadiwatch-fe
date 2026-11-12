import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InvoiceView } from '@/components/operator/InvoiceView';

export const metadata: Metadata = { title: 'Invoice · GaadiWatch' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <InvoiceView />
    </Suspense>
  );
}
