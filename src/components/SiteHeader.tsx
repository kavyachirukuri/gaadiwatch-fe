import Link from 'next/link';
import { Logo } from './Logo';

const links = [
  { href: '/rent', label: 'Rent' },
  { href: '/buy', label: 'Buy' },
  { href: '/list-vehicle', label: 'List your vehicle' },
  { href: '/operator', label: 'For operators' },
  { href: '/help', label: 'Help' },
];

export function SiteHeader() {
  return (
    <header className="nav">
      <Logo />
      <nav aria-label="Main">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </nav>
      <button type="button" className="btn bs" style={{ minHeight: 40 }}>
        Bengaluru
      </button>
      <Link className="btn bt" href="/login">
        Log in
      </Link>
      <Link className="btn bp" href="/login">
        Sign up
      </Link>
    </header>
  );
}
