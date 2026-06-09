'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './splash.css';

export default function SplashPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading for splash screen effect
    const timer = setTimeout(() => {
      setLoading(false);
      // Let's go to dashboard for now
      router.push('/dashboard');
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="splash-container">
      <div className="glass-panel splash-content animate-fade-in">
        <h1 className="splash-title">İngilizce Destek</h1>
        <p className="splash-subtitle">Mobil deneyim artık web'de!</p>
        
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Yükleniyor...</span>
        </div>
      </div>
      
      <div className="bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
    </div>
  );
}
