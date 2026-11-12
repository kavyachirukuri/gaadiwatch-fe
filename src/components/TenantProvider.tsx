'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';
import { tenantHeaders, tenantSlug } from '@/lib/tenant';

export type Tenant = { slug: string; name: string; brandColor: string | null; logoText: string | null; supportEmail: string | null };

const TenantContext = createContext<Tenant | null>(null);
export const useTenant = () => useContext(TenantContext);

/** Darker shade of a #rrggbb colour, for hover states. */
function darken(hex: string, by = 0.25) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * (1 - by)).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

/** Loads this site's brand (GET /tenant) and applies its colour. Unknown subdomains get a clear message. */
export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`${API_URL}/tenant`, { headers: { Accept: 'application/json', ...tenantHeaders() } })
      .then(async (res) => {
        if (!live) return;
        if (res.status === 404 || res.status === 400) return setMissing(true);
        if (res.ok) setTenant((await res.json()) as Tenant);
      })
      .catch(() => undefined); // API down: the pages show their own errors
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!tenant) return;
    const root = document.documentElement.style;
    if (tenant.brandColor) {
      root.setProperty('--green', tenant.brandColor);
      root.setProperty('--green-dark', darken(tenant.brandColor));
    }
    if (tenant.name && !document.title.includes(tenant.name)) document.title = document.title.replace('GaadiWatch', tenant.name);
  }, [tenant]);

  if (missing) {
    return (
      <main className="wrap" style={{ maxWidth: 560, paddingTop: 80, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ fontSize: 28 }}>This site doesn&apos;t exist</h1>
        <p className="mut">There is no rental marketplace at “{tenantSlug()}”, or it has been suspended. Check the address and try again.</p>
      </main>
    );
  }
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

/** The brand name for headers and footers. */
export function BrandName({ fallback = 'GaadiWatch' }: { fallback?: string }) {
  const t = useTenant();
  return <>{t?.logoText ?? t?.name ?? fallback}</>;
}
