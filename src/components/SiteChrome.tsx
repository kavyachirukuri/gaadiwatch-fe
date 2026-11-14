'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';

function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return <>{children}</>;
}

/** Hides the public header and footer on admin pages. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  // usePathname needs a Suspense boundary so pages can still be prerendered
  return (
    <Suspense fallback={children}>
      <Chrome>{children}</Chrome>
    </Suspense>
  );
}
