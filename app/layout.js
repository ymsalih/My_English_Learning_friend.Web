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
  title: 'İngilizce Destek Uygulaması',
  description: 'İngilizce öğrenmenin en modern ve kolay yolu',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" suppressHydrationWarning className={outfit.variable}>
      <body>
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
