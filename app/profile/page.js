'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, collection, query, where, getCountFromServer, orderBy, limit, deleteDoc, updateDoc, increment, getDoc, writeBatch } from 'firebase/firestore';
import { TrendingUp, Mail, Settings, User, Target, BookOpen, LogOut, Moon, Volume2, Trash2 } from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';
import './profile.css';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('progress');
  const [stats, setStats] = useState({ totalCorrect: 0, totalWrong: 0, totalMastered: 0, totalTests: 0, totalAnswered: 0 });
  const [learnedWords, setLearnedWords] = useState(0);
  const [testHistory, setTestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ttsRate, setTtsRate] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);

  useEffect(() => {
    if (!user) return;

    // Fetch Stats
    const userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        if (data.stats) {
          const { totalCorrect = 0, totalWrong = 0, totalMastered = 0, totalTests = 0 } = data.stats;
          setStats({
            totalCorrect,
            totalWrong,
            totalMastered,
            totalTests,
            totalAnswered: totalCorrect + totalWrong + totalMastered
          });
        }
      }
    });

    // Fetch Learned Words using Count (No heavy snapshot)
    const fetchLearnedWords = async () => {
      try {
        const q = query(collection(db, 'users', user.uid, 'words'), where('isLearned', '==', true));
        const snapshot = await getCountFromServer(q);
        setLearnedWords(snapshot.data().count);
      } catch (err) {
        console.error("Öğrenilen kelime sayisi alinirken hata:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLearnedWords();

    // Fetch Test History (Limited to 20 for performance)
    const historyQuery = query(collection(db, 'users', user.uid, 'test_history'), orderBy('timestamp', 'desc'), limit(20));
    const historyUnsubscribe = onSnapshot(historyQuery, (snapshot) => {
      const historyData = [];
      snapshot.forEach(doc => {
        historyData.push({ id: doc.id, ...doc.data() });
      });
      setTestHistory(historyData);
    });

    setTtsRate(parseFloat(localStorage.getItem('tts_rate')) || 1.0);
    setTtsPitch(parseFloat(localStorage.getItem('tts_pitch')) || 1.0);

    return () => {
      userUnsubscribe();
      historyUnsubscribe();
    };
  }, [user]);

  const userName = user?.displayName || user?.email?.split('@')[0] || 'Öğrenci';
  const initial = userName.charAt(0).toUpperCase();

  // Calculate Success Rate
  let successRate = 0;
  if (stats.totalAnswered > 0) {
    successRate = ((stats.totalCorrect + stats.totalMastered - stats.totalWrong) / stats.totalAnswered) * 100;
    if (successRate < 0) successRate = 0;
    successRate = Math.round(successRate);
  }

  // Determine progress color and message
  const isGoodProgress = successRate > 70;
  const progressMessage = stats.totalAnswered > 0 
    ? (isGoodProgress ? "Harika ilerliyorsun!" : "Daha fazla pratik yapabilirsin!")
    : "Sözlüğüne kelime ekle ve testlere katıl!";

  const handleRateChange = (e) => {
    const val = parseFloat(e.target.value);
    setTtsRate(val);
    localStorage.setItem('tts_rate', val);
  };

  const handlePitchChange = (e) => {
    const val = parseFloat(e.target.value);
    setTtsPitch(val);
    localStorage.setItem('tts_pitch', val);
  };

  const testVoice = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Hello! How are you doing today?");
      utterance.lang = "en-US";
      utterance.rate = ttsRate;
      utterance.pitch = ttsPitch;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleDeleteTest = async (testId, testStats) => {
    const confirmDelete = window.confirm("Bu testi silmek istediğinize emin misiniz? Bu işlem, ana başarı oranınızı da geri düşürecektir.");
    if (!confirmDelete) return;

    try {
      // 1. Revert mastered words to isLearned = false if any exist
      if (testStats.masteredWordIds && testStats.masteredWordIds.length > 0) {
        const batch = writeBatch(db);
        testStats.masteredWordIds.forEach(wordId => {
          const wordRef = doc(db, 'users', user.uid, 'words', wordId);
          batch.update(wordRef, { isLearned: false });
        });
        await batch.commit();
      }

      // 2. Safely decrement stats (preventing negative values)
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        let newTotalTests = 0;
        let newTotalCorrect = 0;
        let newTotalWrong = 0;
        let newTotalMastered = 0;

        if (data.stats) {
          const correctDec = testStats.correct || testStats.rememberedCount || 0;
          const wrongDec = testStats.wrong || testStats.forgotCount || 0;
          const masteredDec = testStats.mastered || testStats.masteredCount || 0;

          newTotalTests = Math.max(0, (data.stats.totalTests || 0) - 1);
          newTotalCorrect = Math.max(0, (data.stats.totalCorrect || 0) - correctDec);
          newTotalWrong = Math.max(0, (data.stats.totalWrong || 0) - wrongDec);
          newTotalMastered = Math.max(0, (data.stats.totalMastered || 0) - masteredDec);
        }

        await updateDoc(userRef, {
          'stats.totalTests': newTotalTests,
          'stats.totalCorrect': newTotalCorrect,
          'stats.totalWrong': newTotalWrong,
          'stats.totalMastered': newTotalMastered
        });
      }

      // 3. Delete the test history doc
      await deleteDoc(doc(db, 'users', user.uid, 'test_history', testId));
      
    } catch (err) {
      console.error("Test silinirken hata:", err);
      alert("Test silinirken bir hata oluştu.");
    }
  };

  return (
    <div className="profile-container animate-fade-in">
      {/* Header Profile Card */}
      <div className="profile-header-card glass-panel">
        <div className="avatar-wrapper">
          <div className="avatar-circle">{initial}</div>
        </div>
        <div className="user-info">
          <h1>{userName}</h1>
          <p className="user-email">{user?.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          <TrendingUp className="tab-icon" size={20} />
          Gelişim Raporum
        </button>
        <button 
          className={`tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          <Mail className="tab-icon" size={20} />
          İletişim
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="tab-icon" size={20} />
          Ayarlar
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        
        {/* Progress Report Tab */}
        {activeTab === 'progress' && (
          <div className="animate-fade-in">
            <div className="stats-grid">
              {/* Main Premium Card */}
            <div className="premium-stat-card">
              <div className="stat-left">
                <span className="stat-badge">GENEL DURUM</span>
                <h2 className="stat-title">{progressMessage}</h2>
                <div className="stat-subtitle">
                  <Target size={16} />
                  <span>Öğrenilen Kelime: {loading ? '...' : learnedWords}</span>
                </div>
              </div>
              <div className="stat-right">
                <div className="circular-progress" style={{'--progress': `${successRate}%`, background: `conic-gradient(${isGoodProgress ? '#34D399' : '#fbbf24'} calc(var(--progress)), rgba(255,255,255,0.1) 0deg)`}}>
                  <span className="progress-text">%{loading ? '0' : successRate}</span>
                </div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="detail-stats">
              <div className="detail-card">
                <Target className="detail-icon" size={28} color="var(--success)" />
                <span className="detail-value">{loading ? '...' : stats.totalCorrect}</span>
                <span className="detail-label">Doğru Cevaplar</span>
              </div>
              <div className="detail-card">
                <BookOpen className="detail-icon" size={28} color="var(--warning)" />
                <span className="detail-value">{loading ? '...' : stats.totalTests}</span>
                <span className="detail-label">Çözülen Test</span>
              </div>
            </div>
          </div>

          {/* Test History Section */}
          <div className="history-section">
              <h3><BookOpen size={24} color="var(--primary)" /> Geçmiş Testleriniz</h3>
              {testHistory.length === 0 ? (
                <div className="empty-state">
                  <p>Henüz çözülmüş bir testiniz bulunmuyor.</p>
                </div>
              ) : (
                <div className="history-list">
                  {testHistory.map((test, index) => {
                    const dateStr = test.timestamp?.toDate().toLocaleString('tr-TR', { 
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) || 'Tarih Yok';
                    
                    return (
                      <div key={test.id} className="history-item">
                        <div className="history-info">
                          <div className="history-icon-wrapper">
                            <Target size={24} />
                          </div>
                          <div>
                            <h4 className="history-title">Test #{testHistory.length - index}</h4>
                            <span className="history-date">{dateStr}</span>
                          </div>
                        </div>
                        <div className="history-stats">
                          <div className="history-stat-pill">
                            <span className="stat-correct">{test.correct || test.rememberedCount || 0}</span>
                            <small>Doğru</small>
                          </div>
                          <div className="history-stat-pill">
                            <span className="stat-wrong">{test.wrong || test.forgotCount || 0}</span>
                            <small>Yanlış</small>
                          </div>
                          <div className="history-stat-pill">
                            <span className="stat-mastered">{test.mastered || test.masteredCount || 0}</span>
                            <small>Usta</small>
                          </div>
                          <button 
                            className="delete-test-btn" 
                            title="Bu Testi Sil" 
                            onClick={() => handleDeleteTest(test.id, test)}
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="contact-card glass-panel animate-fade-in">
            <div className="contact-icon-wrapper">
              <Mail size={40} />
            </div>
            <h2>Bize Ulaşın</h2>
            <p>Uygulama hakkında öneri, şikayet veya iş birliği fikirleriniz mi var? Fikirlerinize çok değer veriyoruz. Hemen bizimle iletişime geçin!</p>
            <a 
              href="mailto:myenglishfriendss@gmail.com?subject=Uygulama%20Hakkında%20Öneri%20ve%20Şikayet" 
              className="mail-btn"
            >
              <Mail size={24} /> E-posta Gönder
            </a>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="settings-list animate-fade-in">

            <div className="setting-item glass-panel" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="setting-info" style={{ marginBottom: '1.5rem' }}>
                <h3><Volume2 size={20} style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--primary)'}}/> Ses Ayarları</h3>
                <p>Uygulama içi telaffuz hızını ve ses tonunu (kalın/ince) kendinize göre ayarlayın.</p>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--foreground)' }}>Okuma Hızı ({ttsRate}x)</label>
                </div>
                <input type="range" min="0.5" max="2.0" step="0.1" value={ttsRate} onChange={handleRateChange} style={{width: '100%'}} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  <span>Yavaş</span><span>Hızlı</span>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--foreground)' }}>Ses Tonu ({ttsPitch})</label>
                </div>
                <input type="range" min="0.5" max="2.0" step="0.1" value={ttsPitch} onChange={handlePitchChange} style={{width: '100%'}} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  <span>Kalın</span><span>İnce</span>
                </div>
              </div>

              <button className="btn btn-primary" onClick={testVoice} style={{ alignSelf: 'flex-start' }}>
                Sesi Test Et
              </button>
            </div>

            <div className="setting-item glass-panel">
              <div className="setting-info">
                <h3><Moon size={20} style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle'}}/> Tema Ayarı</h3>
                <p>Uygulama temasını gece veya gündüz moduna değiştirin.</p>
              </div>
              <div>
                <ThemeToggle />
              </div>
            </div>
            
            <div className="setting-item glass-panel">
              <div className="setting-info">
                <h3><LogOut size={20} style={{display: 'inline', marginRight: '8px', verticalAlign: 'middle', color: 'var(--error)'}}/> Hesaptan Çıkış Yap</h3>
                <p>Mevcut oturumunuzu güvenle sonlandırın.</p>
              </div>
              <button className="btn btn-outline" style={{borderColor: 'var(--error)', color: 'var(--error)'}} onClick={logout}>
                Çıkış Yap
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
