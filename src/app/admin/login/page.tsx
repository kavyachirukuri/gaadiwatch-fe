import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminLogin } from '@/components/admin/AdminLogin';

export const metadata: Metadata = { title: 'Admin sign-in · GaadiWatch' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <AdminLogin />
    </Suspense>
  );
}
