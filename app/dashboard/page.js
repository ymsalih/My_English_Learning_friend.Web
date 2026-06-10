'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Video, Camera, PenTool, Layers, Award, TrendingUp, Target, Crown, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, doc, onSnapshot, getCountFromServer } from 'firebase/firestore';
import './dashboard.css';

const modules = [
  { id: 'words', title: 'Kelime Paketleri', desc: 'Dünya standartlarında müfredat ile yeni kelimeler keşfedin ve öğrenme havuzunuza aktarın.', icon: BookOpen, color: '#6366f1', path: '/words' },
  { id: 'my-pool', title: 'Kelime Havuzum', desc: 'Akıllı algoritmalarla kişiselleştirilmiş öğrenme sürecinizi yönetin.', icon: Layers, color: '#14b8a6', path: '/my-pool' },
  { id: 'learned', title: 'Öğrendiklerim', desc: 'Başarıyla tamamladığınız kelime arşivi ve ilerleme raporunuz.', icon: Award, color: '#10b981', path: '/learned' },
  { id: 'translation', title: 'Akıllı Çeviri & OCR', desc: 'Yapay zeka destekli metin ve görsel (kamera) çeviri asistanınız.', icon: PenTool, color: '#ec4899', path: '/translation' },
  { id: 'test', title: 'Kendini Test Et', desc: 'Öğrendiğiniz kelimelerle kendinizi test edin ve gelişiminizi ölçün.', icon: Target, color: '#f59e0b', path: '/test' },
  { id: 'ai-chat', title: 'Yapay Zeka Sohbet', desc: 'İngilizce mülakat koçu, gramer öğretmeni ve sohbet arkadaşınız.', icon: Sparkles, color: '#3b82f6', path: '/ai-chat', badge: 'YAPAY ZEKA' },
  { id: 'story', title: 'Yapay Zeka Hikaye', desc: 'Kelime havuzunuzdaki sözcüklerden size özel hikayeler yaratın.', icon: Sparkles, color: '#f43f5e', path: '/story', badge: 'YENİ' },
  { id: 'video', title: 'Medya ile Pratik', desc: 'Gerçek hayat senaryoları ve premium video içeriklerle dinleme becerilerinizi keskinleştirin.', icon: Video, color: '#a855f7', path: '/video' }
];

export default function Dashboard() {
  const { user, userData, isPro } = useAuth();
  const [totalWords, setTotalWords] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchWordCount = async () => {
      try {
        const coll = collection(db, 'users', user.uid, 'words');
        const snapshot = await getCountFromServer(coll);
        setTotalWords(snapshot.data().count);
      } catch (err) {
        console.error("Kelime sayisi alinirken hata:", err);
      }
    };
    fetchWordCount();

    const userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        if (data.stats) {
          const { totalCorrect = 0, totalWrong = 0, totalMastered = 0 } = data.stats;
          const totalAnswered = totalCorrect + totalWrong + totalMastered;
          
          if (totalAnswered > 0) {
            // Başarı Oranı Formülü: ((Doğru + Usta - Yanlış) / Toplam) * 100
            let rate = ((totalCorrect + totalMastered - totalWrong) / totalAnswered) * 100;
            if (rate < 0) rate = 0;
            setSuccessRate(Math.round(rate));
          } else {
            setSuccessRate(0);
          }
        }
      }
      setLoading(false);
    });

    return () => {
      userUnsubscribe();
    };
  }, [user]);

  return (
    <div className="dashboard-container animate-fade-in">
      <header className="dashboard-header">
        <div className="welcome-section">
          <h1>Hoş Geldiniz, <span className="highlight">İngilizce Serüveniniz Başlıyor</span> {isPro && <Crown size={36} color="#fbbf24" style={{verticalAlign: 'middle', marginLeft: '10px'}} title="Premium Üye" />}</h1>
          <p>Günlük öğrenme hedeflerinize ulaşmak ve dil becerilerinizi sınırların ötesine taşımak için harika bir gün.</p>
          
          {!isPro && userData && (
            <div className="limits-container glass-panel" style={{marginTop: '2rem', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '16px', textAlign: 'left'}}>
              <h3 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}><Crown size={20} color="#fbbf24" /> Ücretsiz Plan Limitleriniz</h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem'}}>
                <div style={{background: 'var(--background)', padding: '1rem', borderRadius: '12px'}}>
                  <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem'}}>Kelime Havuzu</p>
                  <div style={{fontWeight: 'bold', color: (userData.totalWordsAdded || 0) >= 50 ? '#ef4444' : 'var(--foreground)'}}>{userData.totalWordsAdded || 0} / 50 Kelime</div>
                </div>
                <div style={{background: 'var(--background)', padding: '1rem', borderRadius: '12px'}}>
                  <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem'}}>Günlük Test Hakkı</p>
                  <div style={{fontWeight: 'bold', color: (userData.dailyTestCount || 0) >= 1 ? '#ef4444' : 'var(--foreground)'}}>{userData.dailyTestCount || 0} / 1 Test</div>
                </div>
                <div style={{background: 'var(--background)', padding: '1rem', borderRadius: '12px'}}>
                  <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem'}}>Günlük Çeviri (Kamera)</p>
                  <div style={{fontWeight: 'bold', color: (userData.dailyOcrCount || 0) >= 3 ? '#ef4444' : 'var(--foreground)'}}>{userData.dailyOcrCount || 0} / 3 Okutma</div>
                </div>
              </div>
              <Link href="/pricing" className="action-btn primary" style={{marginTop: '1.5rem', display: 'inline-block', textAlign: 'center', textDecoration: 'none', padding: '0.8rem 1.5rem', fontSize: '0.95rem', width: 'auto'}}>Limitleri Kaldır - Premium'a Geç</Link>
            </div>
          )}
        </div>

        <div className="stats-container">
          <div className="stats-card">
            <TrendingUp className="stats-icon" style={{color: 'var(--primary)'}} />
            <div className="stats-info">
              <span className="stats-value">{loading ? '...' : totalWords}</span>
              <span className="stats-label">Havuzdaki Kelimeler</span>
            </div>
          </div>
          
          <div className="stats-card">
            <Target className="stats-icon" style={{color: 'var(--success)'}} />
            <div className="stats-info">
              <span className="stats-value">{loading ? '...' : `%${successRate}`}</span>
              <span className="stats-label">Başarı Oranı</span>
            </div>
          </div>
        </div>
      </header>

      <section className="modules-grid">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link href={mod.path} key={mod.id} className="module-card glass-panel" style={{ '--hover-color': mod.color }}>
              <div className="icon-wrapper" style={{ color: mod.color }}>
                <Icon size={32} />
              </div>
              <div className="module-content">
                <h3>{mod.title}</h3>
                <p>{mod.desc}</p>
              </div>
              {mod.badge && <div className="module-badge">{mod.badge}</div>}
              <div className="module-arrow">→</div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
