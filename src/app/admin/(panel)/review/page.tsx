import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminReview } from '@/components/admin/AdminReview';

export const metadata: Metadata = { title: 'Admin · Review queue' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <AdminReview />
    </Suspense>
  );
}
