'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Check, X, Crown, ShieldCheck, CreditCard, XCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import './pricing.css';

export default function PricingPage() {
  const { user, isPro } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isYearly, setIsYearly] = useState(false);
  
  const handleUpgradeClick = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/iyzico/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          planType: isYearly ? 'yearly' : 'monthly'
        })
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error('Sunucu hatası: Lütfen Vercel panelindeki şifrelerin doğru eklendiğinden ve sitenin yeniden yüklendiğinden (Redeploy) emin olun.');
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Ödeme başlatılamadı');
      }

      if (data.paymentPageUrl) {
        // İyzico'nun kendi güvenli sayfasına yönlendir (Tavsiye edilen)
        window.location.href = data.paymentPageUrl;
      } else if (data.checkoutFormContent) {
        // Eğer Iframe dönüyorsa, ekrana bir div açıp içine basıyoruz
        const modalDiv = document.createElement('div');
        modalDiv.id = 'iyzipay-checkout-form';
        modalDiv.className = 'iyzico-modal-overlay';
        
        // Modal arkası karanlık arka plan
        modalDiv.style.position = 'fixed';
        modalDiv.style.top = '0';
        modalDiv.style.left = '0';
        modalDiv.style.width = '100vw';
        modalDiv.style.height = '100vh';
        modalDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
        modalDiv.style.zIndex = '9999';
        modalDiv.style.display = 'flex';
        modalDiv.style.justifyContent = 'center';
        modalDiv.style.alignItems = 'center';
        
        // Iyzico'nun iframe kodunu içeren scripti çalıştır
        modalDiv.innerHTML = data.checkoutFormContent;
        document.body.appendChild(modalDiv);
        
        // İçindeki scripti tetikle (Next.js içinde innerHTML ile script çalışmaz, manuel append lazım)
        const scriptRegex = new RegExp('<script\\\\b[^>]*>([\\\\s\\\\S]*?)<\\\\/script>', 'gm');
        let match;
        while ((match = scriptRegex.exec(data.checkoutFormContent))) {
          const script = document.createElement('script');
          script.text = match[1];
          document.body.appendChild(script);
        }
      }
      
    } catch (error) {
      console.error("Iyzico init error:", error);
      alert("Ödeme sistemi yüklenirken hata oluştu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pricing-container animate-fade-in">
      <header className="pricing-header">
        <h1>Sınırları Kaldırın. <span className="highlight">Akıcı Konuşun.</span></h1>
        <p>İngilizce öğrenme hızınızı 3x artırmak için ihtiyacınız olan tüm premium araçlara sınırsız erişin.</p>
        
        <div className="billing-toggle-container" style={{marginTop: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px'}}>
          <span style={{color: !isYearly ? 'var(--primary)' : 'var(--text-muted)', fontWeight: !isYearly ? 'bold' : 'normal'}}>Aylık</span>
          <label className="toggle-switch" style={{position: 'relative', display: 'inline-block', width: '60px', height: '34px'}}>
            <input type="checkbox" checked={isYearly} onChange={() => setIsYearly(!isYearly)} style={{opacity: 0, width: 0, height: 0}} />
            <span className="slider round" style={{position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-card)', transition: '.4s', borderRadius: '34px', border: '2px solid var(--primary)'}}>
              <span style={{position: 'absolute', content: '""', height: '26px', width: '26px', left: isYearly ? '28px' : '2px', bottom: '2px', backgroundColor: 'var(--primary)', transition: '.4s', borderRadius: '50%'}}></span>
            </span>
          </label>
          <span style={{color: isYearly ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isYearly ? 'bold' : 'normal', position: 'relative'}}>
            Yıllık
            <span style={{position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#10b981', color: 'white', fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px', whiteSpace: 'nowrap'}}>
              ~ %22 İndirim
            </span>
          </span>
        </div>
      </header>

      <div className="pricing-grid" style={{marginTop: '2rem'}}>
        {/* FREE PLAN */}
        <div className="pricing-card free glass-panel">
          <h2 className="plan-name">Başlangıç</h2>
          <div className="plan-price">
            <span className="price-currency">₺</span>0
            <span className="price-period">/ömür boyu</span>
          </div>
          <p className="plan-description">Temel pratik yapmak ve platformu keşfetmek için ideal.</p>
          
          <ul className="features-list">
            <li><Check size={20} className="feature-icon included" /> Kelime Havuzuna 50 Kelime Ekleme</li>
            <li><Check size={20} className="feature-icon included" /> Günde 5 Yapay Zeka Sohbeti</li>
            <li><Check size={20} className="feature-icon included" /> Günde 5 Yapay Zeka Hikayesi</li>
            <li><Check size={20} className="feature-icon included" /> Günde 5 Telaffuz (Shadowing) Çalışması</li>
            <li><Check size={20} className="feature-icon included" /> Günde 3 Görsel (OCR) Çevirisi</li>
          </ul>
          
          <button className="action-btn secondary" disabled>
            Mevcut Planınız
          </button>
        </div>

        {/* PRO PLAN */}
        <div className="pricing-card pro glass-panel">
          <div className="popular-badge">En Çok Tercih Edilen</div>
          <h2 className="plan-name" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            Premium Pro <Crown size={24} color="#fbbf24" />
          </h2>
          <div className="plan-price">
            <span className="price-currency">₺</span>{isYearly ? '925' : '100'}
            <span className="price-period">/{isYearly ? 'yıllık' : 'aylık'}</span>
          </div>
          <p className="plan-description">Ciddi dil öğrenenler ve kısıtlamalardan sıkılanlar için tam erişim.</p>
          
          <ul className="features-list">
            <li><Check size={20} className="feature-icon included" /> Sınırsız Kelime Havuzu Kapasitesi</li>
            <li><Check size={20} className="feature-icon included" /> Sınırsız Yapay Zeka Sohbeti</li>
            <li><Check size={20} className="feature-icon included" /> Sınırsız Yapay Zeka Hikayesi</li>
            <li><Check size={20} className="feature-icon included" /> Sınırsız Telaffuz Koçu (Shadowing)</li>
            <li><Check size={20} className="feature-icon included" /> Sınırsız Kamera/Görsel Çevirisi (OCR)</li>
            <li><Check size={20} className="feature-icon included" /> 7/24 Öncelikli Eğitim Desteği</li>
          </ul>
          
          {isPro ? (
            <button className="action-btn secondary" disabled>
              Aktif Paketiniz
            </button>
          ) : (
            <button className="action-btn primary" onClick={handleUpgradeClick} disabled={loading}>
              {loading ? 'Güvenli Bağlantı Kuruluyor...' : 'Hemen Premium\'a Geç'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
