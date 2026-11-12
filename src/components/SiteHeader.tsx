import Link from 'next/link';
import { Logo } from './Logo';
import { CityPicker } from './CityPicker';
import { HeaderAccount } from './HeaderAccount';

const links = [
  { href: '/rent', label: 'Rent' },
  { href: '/buy', label: 'Buy' },
  { href: '/list-vehicle', label: 'List your vehicle' },
  { href: '/operator', label: 'Owner dashboard' },
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
      <CityPicker />
      <HeaderAccount />
    </header>
  );
}
