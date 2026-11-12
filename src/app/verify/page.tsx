import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyCenter } from '@/components/auth/VerifyCenter';

export const metadata: Metadata = { title: 'Verification · GaadiWatch' };

export default function VerifyPage() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <VerifyCenter />
    </Suspense>
  );
}
