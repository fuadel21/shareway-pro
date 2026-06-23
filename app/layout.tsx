import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shareway.pro';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ShareWay Pro | Trenes, autobuses y transfers',
    template: '%s | ShareWay Pro'
  },
  description: 'Busca trenes, autobuses y transfers desde ShareWay Pro. Integración preparada para afiliación, deeplinks y futuros partners B2B.',
  openGraph: {
    title: 'ShareWay Pro',
    description: 'Portal independiente para buscar trenes, autobuses y transfers.',
    url: siteUrl,
    siteName: 'ShareWay Pro',
    locale: 'es_ES',
    type: 'website'
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
