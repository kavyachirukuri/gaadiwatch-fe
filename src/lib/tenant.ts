// Which white-label site (tenant) this browser is on, taken from the subdomain:
//   rao.gaadiwatch.in      → "rao"
//   rao.localhost:3000     → "rao"   (works in Chrome/Firefox/Safari without any setup)
//   gaadiwatch.in, www.…   → NEXT_PUBLIC_DEFAULT_TENANT ("gaadiwatch")
const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost';
const DEFAULT = process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? 'gaadiwatch';

export function tenantSlug(): string {
  if (typeof window === 'undefined') return DEFAULT;
  const host = window.location.hostname.toLowerCase();
  if (!host.endsWith(`.${ROOT}`)) return DEFAULT;
  const sub = host.slice(0, -(ROOT.length + 1));
  return !sub || sub === 'www' || sub.includes('.') ? DEFAULT : sub;
}

/** Sent with every API call so the backend uses this tenant's database. */
export const tenantHeaders = (): Record<string, string> => ({ 'X-Tenant': tenantSlug() });
