import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer style={{ borderTop: '1px solid var(--line)', background: '#fff' }}>
      <div className="wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 32px', justifyContent: 'space-between' }}>
        <span className="mut sm">© GaadiWatch · Hyderabad · Bengaluru</span>
        <nav aria-label="Footer" className="sm" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
          <Link href="/help">Help centre</Link>
          <Link href="/terms">Terms of use</Link>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/grievance">Grievance officer</Link>
          <Link href="/cancellation-policy">Cancellation policy</Link>
        </nav>
      </div>
    </footer>
  );
}
