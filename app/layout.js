import Navigation from '../components/Navigation';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../components/ThemeProvider';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export const metadata = {
  title: 'Owlish',
  description: 'İngilizce öğrenmenin en modern ve kolay yolu',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Owlish',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Ekranda yanlışlıkla büyütme/küçültme yapılmasını engeller
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" suppressHydrationWarning className={outfit.variable}>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="page-wrapper">
              <Navigation />
              <main className="main-content">
                {children}
              </main>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
