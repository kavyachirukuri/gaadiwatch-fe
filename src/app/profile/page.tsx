import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProfileView } from '@/components/account/ProfileView';

export const metadata: Metadata = { title: 'Profile · GaadiWatch' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <ProfileView />
    </Suspense>
  );
}
