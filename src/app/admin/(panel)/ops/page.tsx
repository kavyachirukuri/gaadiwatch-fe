import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminOps } from '@/components/admin/AdminOps';

export const metadata: Metadata = { title: 'Admin · Disputes & users' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <AdminOps />
    </Suspense>
  );
}
