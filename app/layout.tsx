import type { Metadata } from 'next';
import { Archivo, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const displayFont = Archivo({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['300', '400', '500', '600', '700']
});

const bodyFont = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600']
});

export const metadata: Metadata = {
  title: 'S.Goodie Photography',
  description:
    'Interiors, travel, and brand marketing photography. A curated portfolio of modern imagery.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
