import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const metadata: Metadata = { title: 'Admin · Marketplace health' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <AdminDashboard />
    </Suspense>
  );
}
