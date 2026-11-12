import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AuthProvider } from '@/lib/auth';
import { SiteChrome } from '@/components/SiteChrome';
import { TenantProvider } from '@/components/TenantProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });

export const metadata: Metadata = {
  title: 'GaadiWatch — Rent, buy and sell vehicles',
  description:
    'Rent scooters, bikes, EVs and cars from licensed operators in Hyderabad and Bengaluru, or buy and sell any vehicle — with GPS tracking built in.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <TenantProvider>
          <AuthProvider>
            <SiteChrome>
              <SiteHeader />
            </SiteChrome>
            {children}
            <SiteChrome>
              <SiteFooter />
            </SiteChrome>
          </AuthProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
