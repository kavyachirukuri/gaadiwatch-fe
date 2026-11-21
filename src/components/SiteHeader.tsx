'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { usePathname } from 'next/navigation';
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

/**
 * Phones and tablets: logo, account and a menu button that opens a drawer.
 * Desktops: the full link row and city picker.
 */
export function SiteHeader() {
  // usePathname needs a Suspense boundary so pages can be prerendered;
  // until the path is known the header shows without the current-page highlight
  return (
    <Suspense fallback={<Header pathname="" />}>
      <HeaderWithPath />
    </Suspense>
  );
}

function HeaderWithPath() {
  return <Header pathname={usePathname()} />;
}

function Header({ pathname }: { pathname: string }) {
  // The drawer belongs to the page it was opened on, so it closes by itself after navigating
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const isCur = (href: string) => pathname !== '' && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <header className="nav">
      <Logo />
      <nav aria-label="Main" className="nav-links">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={isCur(l.href) ? 'cur' : ''} aria-current={isCur(l.href) ? 'page' : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
      <span className="nav-spacer" />
      <span className="hide-md">
        <CityPicker />
      </span>
      <HeaderAccount />
      <button
        type="button"
        className="nav-burger"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="main-drawer"
        onClick={() => setOpenOn(open ? null : pathname)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <nav id="main-drawer" className="nav-drawer" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={isCur(l.href) ? 'cur' : ''} aria-current={isCur(l.href) ? 'page' : undefined} onClick={() => setOpenOn(null)}>
              {l.label}
            </Link>
          ))}
          <div style={{ paddingTop: 14 }}>
            <CityPicker />
          </div>
        </nav>
      )}
    </header>
  );
}
