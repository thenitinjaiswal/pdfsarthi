import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata = {
  title: {
    default: 'SarthiPDF — Free Online PDF Tools',
    template: '%s | SarthiPDF',
  },
  description:
    'SarthiPDF is the ultimate free PDF toolkit — merge, split, compress, convert, edit, sign, watermark and more. 100% private, no file uploads, AI-powered tools.',
  keywords: ['PDF tools', 'PDF merger', 'PDF compressor', 'PDF converter', 'PDF editor', 'free PDF', 'online PDF'],
  authors: [{ name: 'SarthiPDF' }],
  creator: 'SarthiPDF',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sarthipdf.com',
    title: 'SarthiPDF — Free Online PDF Tools',
    description: 'The ultimate free PDF toolkit. Merge, split, compress, convert, edit, sign, and more.',
    siteName: 'SarthiPDF',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SarthiPDF — Free Online PDF Tools',
    description: 'The ultimate free PDF toolkit. Merge, split, compress, convert, edit, sign, and more.',
    creator: '@sarthipdf',
  },
  robots: { index: true, follow: true },
  metadataBase: new URL('https://sarthipdf.com'),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} dark`} suppressHydrationWarning>
      <body className="bg-dark-950 text-dark-50 antialiased">
        {children}
      </body>
    </html>
  );
}
