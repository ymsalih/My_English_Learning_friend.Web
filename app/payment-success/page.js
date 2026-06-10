'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, Crown, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { isPro, user, loading } = useAuth();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // If the page is loaded and the user is verified as PRO, count down and redirect
    if (user && isPro) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [user, isPro, router]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Yükleniyor...</div>;
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.card} className="glass-panel">
        <div style={styles.iconWrapper}>
          <CheckCircle size={80} color="#10b981" />
        </div>
        
        <h1 style={styles.title}>Ödeme Başarılı!</h1>
        <p style={styles.subtitle}>Aramıza Hoş Geldiniz, <span style={{color: 'var(--primary)'}}>{user?.displayName || 'Premium Üye'}</span>!</p>
        
        <div style={styles.featureBox}>
          <Crown size={32} color="#fbbf24" style={{ marginBottom: '10px' }} />
          <h3>Premium Pro Aktif Edildi</h3>
          <p>Tüm yapay zeka sınırları kaldırıldı. Sınırsız kelime havuzu ve tüm özellikler anında hesabınıza tanımlandı.</p>
        </div>

        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          {countdown} saniye içinde ana sayfaya yönlendiriliyorsunuz...
        </p>

        <Link href="/" className="action-btn primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', textDecoration: 'none' }}>
          Hemen Başla <ArrowRight size={20} style={{ marginLeft: '10px' }} />
        </Link>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 'calc(100vh - 80px)',
    padding: '20px',
  },
  card: {
    maxWidth: '500px',
    width: '100%',
    padding: '40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: '20px',
    animation: 'pulse 2s infinite',
  },
  title: {
    fontSize: '2.5rem',
    color: '#10b981', // green
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '30px',
  },
  featureBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '30px',
    width: '100%',
  }
};
