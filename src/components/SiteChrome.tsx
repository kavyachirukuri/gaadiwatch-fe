'use client';

import { usePathname } from 'next/navigation';

/** Hides the public header and footer on admin pages. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return <>{children}</>;
}
