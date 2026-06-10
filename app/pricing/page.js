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
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Fake Card States for Simulation
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const handleUpgradeClick = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setShowModal(true);
  };

  const handleSimulatedPayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate network request to Iyzico/Banka
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update Firebase directly (Simulating Webhook behavior)
      await updateDoc(doc(db, 'users', user.uid), {
        plan: 'pro'
      });
      
      alert("Ödeme Başarılı! Pro özellikleriniz anında aktif edildi. 🎉");
      setShowModal(false);
      window.location.reload(); // Reload to refresh AuthContext state
      
    } catch (error) {
      console.error("Payment error:", error);
      alert("Ödeme sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pricing-container animate-fade-in">
      <header className="pricing-header">
        <h1>Sınırları Kaldırın. <span className="highlight">Akıcı Konuşun.</span></h1>
        <p>İngilizce öğrenme hızınızı 3x artırmak için ihtiyacınız olan tüm premium araçlara sınırsız erişin.</p>
      </header>

      <div className="pricing-grid">
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
            <li><Check size={20} className="feature-icon included" /> Temel Kelime Paketleri (A1-A2)</li>
            <li><Check size={20} className="feature-icon included" /> Günde 3 Görsel (Kamera) Çevirisi</li>
            <li><Check size={20} className="feature-icon included" /> Sınırsız Metin Çevirisi</li>
            <li className="excluded"><X size={20} className="feature-icon excluded" /> Gelişmiş Deneme Sınavları</li>
            <li className="excluded"><X size={20} className="feature-icon excluded" /> YDS/TOEFL Kelime Paketleri</li>
            <li className="excluded"><X size={20} className="feature-icon excluded" /> Reklamsız Deneyim</li>
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
            <span className="price-currency">₺</span>149
            <span className="price-period">/aylık</span>
          </div>
          <p className="plan-description">Ciddi dil öğrenenler ve sınırları sevmeyenler için tam erişim.</p>
          
          <ul className="features-list">
            <li><Check size={20} className="feature-icon included" /> Sınırsız Kelime Havuzu Kapasitesi</li>
            <li><Check size={20} className="feature-icon included" /> Tüm İleri Seviye Kelime Paketleri</li>
            <li><Check size={20} className="feature-icon included" /> Sınırsız Kamera/Görsel Çevirisi (OCR)</li>
            <li><Check size={20} className="feature-icon included" /> Dinamik Örnek Cümle Analizi</li>
            <li><Check size={20} className="feature-icon included" /> Gelişmiş Deneme Sınavları</li>
            <li><Check size={20} className="feature-icon included" /> YDS/TOEFL ve İş İngilizcesi Modülleri</li>
            <li><Check size={20} className="feature-icon included" /> Tamamen Reklamsız Deneyim</li>
          </ul>
          
          {isPro ? (
            <button className="action-btn secondary" disabled>
              Aktif Paketiniz
            </button>
          ) : (
            <button className="action-btn primary" onClick={handleUpgradeClick}>
              Hemen Premium'a Geç
            </button>
          )}
        </div>
      </div>

      {/* PAYMENT SIMULATION MODAL */}
      {showModal && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <button className="close-modal" onClick={() => setShowModal(false)}><XCircle size={28} /></button>
            <h2 style={{marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px'}}>
              <CreditCard color="var(--primary)" /> Güvenli Ödeme
            </h2>
            <p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>Test (Sandbox) ortamındasınız. Lütfen sahte kredi kartı bilgileri giriniz. Gerçek para çekilmez.</p>
            
            <form className="payment-form" onSubmit={handleSimulatedPayment}>
              <div className="form-group">
                <label>Kart Üzerindeki İsim</label>
                <input type="text" required placeholder="Ad Soyad" className="payment-input" />
              </div>
              
              <div className="form-group">
                <label>Kart Numarası (Test İçin: 4111 1111 1111 1111)</label>
                <input 
                  type="text" 
                  required 
                  placeholder="0000 0000 0000 0000" 
                  maxLength="16" 
                  className="payment-input"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Son Kullanma (AA/YY)</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="12/26" 
                    maxLength="5" 
                    className="payment-input" 
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>CVC (Güvenlik Kodu)</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="123" 
                    maxLength="3" 
                    className="payment-input"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>
              
              <button type="submit" className="action-btn primary" disabled={loading} style={{marginTop: '1rem'}}>
                {loading ? 'İşleniyor...' : '149 ₺ Güvenli Öde'}
              </button>
              
              <div className="secure-badge">
                <ShieldCheck size={18} /> 256-bit SSL Güvencesiyle İyzico Altyapısı
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
