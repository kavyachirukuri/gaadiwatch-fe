import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginFlow } from '@/components/auth/LoginFlow';

export const metadata: Metadata = { title: 'Log in · GaadiWatch' };

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <LoginFlow />
    </Suspense>
  );
}
