import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import Providers from '@/components/providers';
import ThemeProvider from '@/components/ThemeProvider';
import Navbar from '@/components/Navbar';
import AppEntry from '@/components/AppEntry';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import InstallBanner from '@/components/InstallBanner';
import { Toaster } from 'sonner';
import './globals.css';

// Inter Tight and JetBrains Mono are variable fonts: one file covers every
// weight, so no `weight` list (listing weights makes Next download a separate
// file per weight, which is what broke the Vercel build).
const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400', // not a variable font, so the weight is required
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
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
      {/* Inter Tight everywhere (it replaces plain Inter, one less font to download).
          Dark background from the first paint, so there's no white flash between pages. */}
      <body className={`${interTight.className} bg-[#080f0a] text-[#e9efe9] antialiased`}>
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