'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { RefreshCcw, Trash2, Volume2, Award, Search } from 'lucide-react';
import { speakWord } from '../../lib/tts';
import '../my-pool/pool.css'; // Reusing the same CSS

export default function LearnedWordsPage() {
  const { user } = useAuth();
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [visibleCount, setVisibleCount] = useState(20);
  const observerTarget = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Denenecek ilk sorgu (İndeks gerektirebilir)
    const qWithIndex = query(
      collection(db, 'users', user.uid, 'words'),
      where('isLearned', '==', true),
      orderBy('timestamp', 'desc'),
      limit(visibleCount)
    );

    let unsubscribeFallback = null;

    const unsubscribe = onSnapshot(qWithIndex, (snapshot) => {
      const wordsData = [];
      snapshot.forEach((doc) => {
        const data = doc.data({ serverTimestamps: 'estimate' });
        wordsData.push({ id: doc.id, ...data });
      });
      setWords(wordsData);
      setLoading(false);
    }, (error) => {
      console.warn("Firestore index error, falling back to local sorting:", error);
      // İndeks yoksa tümünü çekip yerelde sınırla (Fallback)
      const qFallback = query(
        collection(db, 'users', user.uid, 'words'),
        where('isLearned', '==', true)
      );
      
      unsubscribeFallback = onSnapshot(qFallback, (snapshot) => {
        const wordsData = [];
        snapshot.forEach((doc) => {
          const data = doc.data({ serverTimestamps: 'estimate' });
          wordsData.push({ id: doc.id, ...data });
        });
        
        wordsData.sort((a, b) => {
          const timeA = a.timestamp?.seconds || 0;
          const timeB = b.timestamp?.seconds || 0;
          return timeB - timeA;
        });

        setWords(wordsData.slice(0, visibleCount));
        setLoading(false);
      });
    });

    return () => {
      unsubscribe();
      if (unsubscribeFallback) unsubscribeFallback();
    };
  }, [user, visibleCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + 20);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [observerTarget.current]);

  // Removed local speakWord

  const restoreToPool = async (wordId) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'words', wordId), {
        isLearned: false
      });
    } catch (error) {
      console.error("Error updating document: ", error);
      alert("Kelime güncellenirken hata oluştu: " + error.message);
    }
  };

  const deleteWord = async (wordId) => {
    if (!user) return;
    if (window.confirm('Bu kelimeyi kalıcı olarak silmek istediğinize emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'words', wordId));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Kelime silinirken hata oluştu: " + error.message);
      }
    }
  };

  if (loading) {
    return <div className="pool-container loading"><div className="spinner"></div></div>;
  }

  const filteredWords = words.filter(word => 
    word.eng.toLowerCase().includes(searchTerm.toLowerCase()) || 
    word.tr.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pool-container animate-fade-in">
      <header className="page-header">
        <h1>Öğrendiklerim <span className="highlight">(Arşiv)</span></h1>
        <p>Testlerde başarılı olduğun kelimeler burada. İstediğin zaman tekrar havuza alabilirsin.</p>
      </header>

      {/* Search Bar */}
      {words.length > 0 && (
        <div className="search-bar-container glass-panel">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            placeholder="İngilizce veya Türkçe kelime ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      )}

      {words.length === 0 ? (
        <div className="empty-state glass-panel">
          <Award size={64} color="var(--primary)" style={{marginBottom: '1rem'}} />
          <h2>Henüz öğrendiğin kelime yok</h2>
          <p>Kelime havuzunda çalışarak kelimeleri "Öğrendim" olarak işaretle!</p>
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="empty-state glass-panel">
          <h2>Sonuç Bulunamadı</h2>
          <p>"{searchTerm}" kelimesi ile eşleşen bir sonuç yok.</p>
        </div>
      ) : (
        <div className="words-list">
          {filteredWords.map((word) => (
            <div key={word.id} className="word-card glass-panel" style={{borderLeft: '4px solid var(--success)'}}>
              <div className="word-info">
                <h3 className="word-eng">{word.eng}</h3>
                <p className="word-tr">{word.tr}</p>
              </div>
              
              <div className="word-actions">
                <button className="action-btn speak-btn" onClick={() => speakWord(word.eng)}>
                  <Volume2 size={20} />
                </button>
                <button className="action-btn success-btn" onClick={() => restoreToPool(word.id)} title="Havuza Geri Al">
                  <RefreshCcw size={20} />
                </button>
                <button className="action-btn danger-btn" onClick={() => deleteWord(word.id)} title="Kalıcı Sil">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
          {filteredWords.length >= visibleCount && (
            <div ref={observerTarget} style={{ height: '40px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem' }}>
              <div className="spinner" style={{width: '24px', height: '24px'}}></div>
              <span style={{marginLeft: '10px', color: 'var(--text-muted)', fontSize: '0.9rem'}}>Daha fazla yükleniyor...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
