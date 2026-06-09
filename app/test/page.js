'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Target, RotateCcw, CheckCircle, XCircle, Award, Volume2, Settings } from 'lucide-react';
import { speakWord } from '../../lib/tts';
import './test.css';

export default function TestPage() {
  const { user } = useAuth();
  
  const [allAvailableWords, setAllAvailableWords] = useState([]);
  const [words, setWords] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [selectedWordCount, setSelectedWordCount] = useState(10);
  
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Stats
  const [masteredCount, setMasteredCount] = useState(0);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [forgotCount, setForgotCount] = useState(0);
  const [testCompleted, setTestCompleted] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWords();
    }
  }, [user]);

  const fetchWords = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users', user.uid, 'words'),
        where('isLearned', '==', false)
      );
      const snapshot = await getDocs(q);
      const wordsData = [];
      snapshot.forEach(doc => {
        const data = doc.data({ serverTimestamps: 'estimate' });
        wordsData.push({ id: doc.id, ...data });
      });
      
      // Sort by lastReviewed (oldest first)
      wordsData.sort((a, b) => {
        const timeA = a.lastReviewed?.seconds || 0;
        const timeB = b.lastReviewed?.seconds || 0;
        return timeA - timeB;
      });
      
      setAllAvailableWords(wordsData);
      
      if (wordsData.length > 0) {
        setSelectedWordCount(Math.min(10, wordsData.length));
      }
      
      setIsSetupMode(true);
      setTestCompleted(false);
    } catch (error) {
      console.error("Error fetching words:", error);
    } finally {
      setLoading(false);
    }
  };

  const startTest = () => {
    // Take the top N words (already sorted by oldest lastReviewed)
    const sessionWords = allAvailableWords.slice(0, selectedWordCount);
    
    // Shuffle the selected words so they don't appear in the exact same order
    for (let i = sessionWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sessionWords[i], sessionWords[j]] = [sessionWords[j], sessionWords[i]];
    }
    
    setWords(sessionWords);
    setCurrentWordIndex(0);
    setIsFlipped(false);
    setMasteredCount(0);
    setRememberedCount(0);
    setForgotCount(0);
    setIsSetupMode(false);
    setTestCompleted(false);
  };

  const handleAction = async (action) => {
    if (!user || words.length === 0) return;
    
    const currentWord = words[currentWordIndex];
    const updateData = {
      lastReviewed: serverTimestamp()
    };

    if (action === 'mastered') {
      updateData.isLearned = true;
      setMasteredCount(prev => prev + 1);
    } else if (action === 'remembered') {
      setRememberedCount(prev => prev + 1);
    } else if (action === 'forgot') {
      setForgotCount(prev => prev + 1);
    }

    // Update in background
    try {
      await updateDoc(doc(db, 'users', user.uid, 'words', currentWord.id), updateData);
    } catch (err) {
      console.error("Error updating word:", err);
    }

    // Move to next word
    if (currentWordIndex + 1 < words.length) {
      setIsFlipped(false);
      setCurrentWordIndex(prev => prev + 1);
    } else {
      setTestCompleted(true);
      
      // Save test result to database
      const finalMastered = action === 'mastered' ? masteredCount + 1 : masteredCount;
      const finalRemembered = action === 'remembered' ? rememberedCount + 1 : rememberedCount;
      const finalForgot = action === 'forgot' ? forgotCount + 1 : forgotCount;
      const totalWords = words.length;
      
      try {
        await addDoc(collection(db, 'users', user.uid, 'test_history'), {
          timestamp: serverTimestamp(),
          totalQuestions: totalWords,
          masteredCount: finalMastered,
          rememberedCount: finalRemembered,
          forgotCount: finalForgot,
          successRate: Math.round(((finalRemembered + finalMastered) / totalWords) * 100)
        });
      } catch (err) {
        console.error("Test sonucu kaydedilirken hata:", err);
      }
    }
  };

  if (loading) {
    return <div className="test-container loading"><div className="spinner"></div></div>;
  }

  if (allAvailableWords.length === 0) {
    return (
      <div className="test-container animate-fade-in">
        <header className="page-header">
          <h1>Kendini <span className="highlight">Test Et</span></h1>
        </header>
        <div className="empty-state glass-panel">
          <Target size={64} color="var(--primary)" style={{marginBottom: '1rem'}} />
          <h2>Test Edilecek Kelime Yok</h2>
          <p>Havuzunda henüz öğrenilmemiş kelime bulunmuyor. Kelime Paketleri'nden yeni kelimeler ekleyerek test yapabilirsin!</p>
        </div>
      </div>
    );
  }

  // --- SETUP SCREEN ---
  if (isSetupMode) {
    return (
      <div className="test-container animate-fade-in">
        <header className="page-header">
          <h1>Kendini <span className="highlight">Test Et</span></h1>
          <p>Uygulama arka planda havuzunuzu analiz etti. Eskiden yeniye en çok tekrar bekleyen kelimeleriniz hazır.</p>
        </header>
        
        <div className="setup-card glass-panel">
          <Settings size={64} color="var(--primary)" style={{marginBottom: '1rem'}} />
          <h2 className="setup-title">Test Ayarları</h2>
          <p className="setup-desc">Havuzda öğrenilmeyi bekleyen toplam <strong>{allAvailableWords.length}</strong> kelimeniz var.</p>
          
          <div className="setup-controls">
            <div className="selected-count-display">
              <span className="count-number">{selectedWordCount}</span>
              <span className="count-label">Kelime</span>
            </div>
            
            <input 
              type="range" 
              min="1" 
              max={allAvailableWords.length} 
              value={selectedWordCount} 
              onChange={(e) => setSelectedWordCount(parseInt(e.target.value))}
              className="styled-slider"
            />
            
            <div className="chip-container">
              {[10, 20, 50].map(count => {
                if (count > allAvailableWords.length) return null;
                return (
                  <button 
                    key={count} 
                    className={`setup-chip ${selectedWordCount === count ? 'active' : ''}`}
                    onClick={() => setSelectedWordCount(count)}
                  >
                    {count}
                  </button>
                );
              })}
              <button 
                className={`setup-chip ${selectedWordCount === allAvailableWords.length ? 'active' : ''}`}
                onClick={() => setSelectedWordCount(allAvailableWords.length)}
              >
                Hepsi
              </button>
            </div>
            
            <button className="start-test-btn" onClick={startTest}>
              Teste Başla
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- SUCCESS SCREEN ---
  if (testCompleted) {
    const successRate = ((rememberedCount + masteredCount) / words.length) * 100;
    return (
      <div className="test-container animate-fade-in">
        <div className="success-state glass-panel">
          <Award size={80} color="var(--success)" style={{marginBottom: '1rem'}} />
          <h2>Test Tamamlandı!</h2>
          <p>İşte bu çalışmadaki performans analizin:</p>
          
          <div className="score-summary" style={{ fontSize: '4rem', margin: '2rem 0' }}>
            %{successRate.toFixed(0)}
          </div>
          
          <div className="stats-grid">
            <div className="stat-box" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <CheckCircle size={32} style={{ margin: '0 auto 10px' }} />
              <h3>Hatırlanan</h3>
              <p>{rememberedCount}</p>
            </div>
            <div className="stat-box" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
              <XCircle size={32} style={{ margin: '0 auto 10px' }} />
              <h3>Unutulan</h3>
              <p>{forgotCount}</p>
            </div>
            <div className="stat-box" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Award size={32} style={{ margin: '0 auto 10px' }} />
              <h3>Öğrenilen</h3>
              <p>{masteredCount}</p>
            </div>
          </div>
          
          <button className="btn btn-primary" style={{ marginTop: '2rem' }} onClick={fetchWords}>
            Yeni Test Başlat
          </button>
        </div>
      </div>
    );
  }

  // --- TEST SCREEN ---
  const currentWord = words[currentWordIndex];

  return (
    <div className="test-container animate-fade-in">
      <header className="page-header">
        <h1>Kendini <span className="highlight">Test Et</span></h1>
        <p>İngilizce kelimeye bak, Türkçe anlamını içinden söyle ve karta dokunarak kontrol et!</p>
        <div className="progress-bar-container">
          <div className="progress-text">Kalan: {words.length - currentWordIndex} / {words.length}</div>
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${(currentWordIndex / words.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </header>

      <div className="flashcard-section">
        <div 
          className={`flashcard glass-panel ${isFlipped ? 'flipped' : ''}`} 
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className="flashcard-inner">
            <div className="flashcard-front">
              <button className="speak-btn-corner" onClick={(e) => { e.stopPropagation(); speakWord(currentWord.eng); }}>
                <Volume2 size={24} />
              </button>
              <h2>{currentWord.eng}</h2>
              <div className="flip-hint">
                <RotateCcw size={16} />
                <span>Çevirmek İçin Dokun</span>
              </div>
            </div>
            <div className="flashcard-back">
              <h2>{currentWord.tr}</h2>
              <div className="flip-hint">
                <RotateCcw size={16} />
                <span>Geri Dönmek İçin Dokun</span>
              </div>
            </div>
          </div>
        </div>

        {isFlipped && (
          <div className="action-buttons-row animate-fade-in">
            <button className="action-card-btn forgot-btn" onClick={() => handleAction('forgot')}>
              <XCircle size={28} />
              <span>Unuttum</span>
            </button>
            <button className="action-card-btn remembered-btn" onClick={() => handleAction('remembered')}>
              <CheckCircle size={28} />
              <span>Hatırladım</span>
            </button>
            <button className="action-card-btn mastered-btn" onClick={() => handleAction('mastered')}>
              <Award size={28} />
              <span>Öğrendim</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
