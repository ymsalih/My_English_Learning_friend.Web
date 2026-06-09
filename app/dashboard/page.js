'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Video, Camera, PenTool, Layers, Award, TrendingUp, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import './dashboard.css';

const modules = [
  { id: 'words', title: 'Kelime Paketleri', desc: 'Dünya standartlarında müfredat ile yeni kelimeler keşfedin ve öğrenme havuzunuza aktarın.', icon: BookOpen, color: '#6366f1', path: '/words' },
  { id: 'my-pool', title: 'Kelime Havuzum', desc: 'Akıllı algoritmalarla kişiselleştirilmiş öğrenme sürecinizi yönetin.', icon: Layers, color: '#14b8a6', path: '/my-pool' },
  { id: 'learned', title: 'Öğrendiklerim', desc: 'Başarıyla tamamladığınız kelime arşivi ve ilerleme raporunuz.', icon: Award, color: '#10b981', path: '/learned' },
  { id: 'translation', title: 'Akıllı Çeviri & OCR', desc: 'Yapay zeka destekli metin ve görsel (kamera) çeviri asistanınız.', icon: PenTool, color: '#ec4899', path: '/translation' },
  { id: 'video', title: 'Medya ile Pratik', desc: 'Gerçek hayat senaryoları ve premium video içeriklerle dinleme becerilerinizi keskinleştirin.', icon: Video, color: '#a855f7', path: '/video' }
];

export default function Dashboard() {
  const { user } = useAuth();
  const [totalWords, setTotalWords] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const wordsUnsubscribe = onSnapshot(collection(db, 'users', user.uid, 'words'), (snapshot) => {
      setTotalWords(snapshot.docs.length);
    });

    const userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        if (data.stats) {
          const { totalCorrect = 0, totalWrong = 0 } = data.stats;
          const totalAnswered = totalCorrect + totalWrong;
          
          if (totalAnswered > 0) {
            // Başarı Oranı Formülü: ((Doğru - Yanlış) / Toplam) * 100
            let rate = ((totalCorrect - totalWrong) / totalAnswered) * 100;
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
      wordsUnsubscribe();
      userUnsubscribe();
    };
  }, [user]);

  return (
    <div className="dashboard-container animate-fade-in">
      <header className="dashboard-header">
        <div className="welcome-section">
          <h1>Hoş Geldiniz, <span className="highlight">İngilizce Serüveniniz Başlıyor</span></h1>
          <p>Günlük öğrenme hedeflerinize ulaşmak ve dil becerilerinizi sınırların ötesine taşımak için harika bir gün.</p>
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
              <div className="module-arrow">→</div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
