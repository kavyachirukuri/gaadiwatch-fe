import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminSettings } from '@/components/admin/AdminSettings';

export const metadata: Metadata = { title: 'Admin · Settings' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <AdminSettings />
    </Suspense>
  );
}
