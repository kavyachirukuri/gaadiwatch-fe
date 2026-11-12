import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ChecklistView } from '@/components/booking/ChecklistView';

export const metadata: Metadata = { title: 'Hand-over checklist · GaadiWatch' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <ChecklistView />
    </Suspense>
  );
}
