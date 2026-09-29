import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'TaxOS — Your entire tax picture. In one place.', template: '%s · TaxOS' },
  description:
    'TaxOS brings together salary, investments, interest, dividends, TDS and tax documents, organizes everything and shows what you owe and what still needs attention. Not affiliated with the Income Tax Department.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0a0a0a' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
