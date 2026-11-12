import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MessagesView } from '@/components/chat/MessagesView';

export const metadata: Metadata = { title: 'Messages · GaadiWatch' };

export default function Page() {
  return (
    <Suspense fallback={<main className="wrap mut">Loading…</main>}>
      <MessagesView />
    </Suspense>
  );
}
