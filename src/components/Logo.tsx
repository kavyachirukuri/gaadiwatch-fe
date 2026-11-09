import Link from 'next/link';

export function Logo() {
  return (
    <Link className="logo" href="/">
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="7" fill="#0B6E5A" />
        <path d="M12 18s-4.5-3.8-4.5-7a4.5 4.5 0 0 1 9 0c0 3.2-4.5 7-4.5 7z" fill="none" stroke="#fff" strokeWidth="2" />
        <circle cx="12" cy="11" r="1.6" fill="#fff" />
      </svg>
      GaadiWatch
    </Link>
  );
}
