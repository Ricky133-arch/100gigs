import { Inter, Inter_Tight, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import Providers from '@/components/providers';
import ThemeProvider from '@/components/ThemeProvider';
import Navbar from '@/components/Navbar';
import AppEntry from '@/components/AppEntry';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import InstallBanner from '@/components/InstallBanner';
import { Toaster } from 'sonner';
import './globals.css';

// Default body font for the rest of the app (unchanged)
const inter = Inter({ subsets: ['latin'] });

// Homepage fonts — exposed as CSS variables so any page can opt in
const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: '100Gigs - Port Harcourt Gig Marketplace',
  description: 'Find skilled service providers or get hired in Port Harcourt, Nigeria',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '100Gigs',
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
};

// themeColor now lives here, as required by current Next.js versions
export const viewport = {
  themeColor: '#080f0a',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className={`${inter.className} bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100`}>
        <Providers>
          <ThemeProvider>
            <AppEntry>
              <ServiceWorkerRegister />
              <InstallBanner />
              <main>{children}</main>
              <Navbar />
            </AppEntry>
            <Toaster position="top-center" richColors />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}