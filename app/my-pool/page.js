'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, increment, orderBy, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { CheckCircle, Trash2, Volume2, Plus, Search } from 'lucide-react';
import { speakWord } from '../../lib/tts';
import './pool.css';

export default function MyPoolPage() {
  const { user, isPro, userData } = useAuth();
  const router = useRouter();
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newEng, setNewEng] = useState('');
  const [newTr, setNewTr] = useState('');
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [visibleCount, setVisibleCount] = useState(20);
  const observerTarget = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Denenecek ilk sorgu (İndeks gerektirebilir)
    const qWithIndex = query(
      collection(db, 'users', user.uid, 'words'),
      where('isLearned', '==', false),
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
        where('isLearned', '==', false)
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

  const markAsLearned = async (wordId) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'words', wordId), {
        isLearned: true
      });
    } catch (error) {
      console.error("Error updating document: ", error);
      alert("Kelime güncellenirken hata oluştu: " + error.message);
    }
  };

  const deleteWord = async (wordId) => {
    if (!user) return;
    if (window.confirm('Bu kelimeyi havuzdan silmek istediğinize emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'words', wordId));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Kelime silinirken hata oluştu: " + error.message);
      }
    }
  };

  const handleAddWord = async (e) => {
    e.preventDefault();
    if (!user || !newEng.trim() || !newTr.trim()) return;
    
    // Limit Check
    if (!isPro && userData) {
      if ((userData.totalWordsAdded || 0) >= 50) {
        alert("Ücretsiz planda kelime havuzunuza en fazla 50 kelime ekleyebilirsiniz. Sınırsız kelime için Pro'ya geçin!");
        router.push('/pricing');
        return;
      }
    }

    setAdding(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'words'), {
        eng: newEng.trim(),
        tr: newTr.trim(),
        timestamp: serverTimestamp(),
        isLearned: false,
        lastReviewed: new Date(0)
      });

      if (!isPro) {
        await updateDoc(doc(db, 'users', user.uid), {
          totalWordsAdded: increment(1)
        });
      }

      setNewEng('');
      setNewTr('');
      setShowForm(false);
    } catch (error) {
      console.error("Error adding word:", error);
      alert("Kelime eklenirken hata oluştu: " + error.message);
    } finally {
      setAdding(false);
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
        <h1>Kelime <span className="highlight">Havuzum</span></h1>
        <p>Paketlerden eklediğin veya manuel girdiğin kelimeler burada birikir. Öğrendiğin kelimeleri işaretle.</p>
        
        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="glass-panel" style={{ padding: '0.6rem 1.2rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', border: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Kapasite:</span> 
            <strong style={{ color: isPro ? 'var(--primary)' : ((userData?.totalWordsAdded || 0) >= 50 ? '#ef4444' : 'var(--foreground)') }}>
              {isPro ? 'Sınırsız 👑' : `${userData?.totalWordsAdded || 0} / 50`}
            </strong>
          </div>
          
          <button 
            className="btn btn-primary" 
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'İptal' : '+ Manuel Kelime Ekle'}
          </button>
        </div>
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

      {showForm && (
        <form onSubmit={handleAddWord} className="add-word-section glass-panel">
          <div className="form-group">
            <input 
              type="text" 
              placeholder="İngilizce Kelime" 
              value={newEng}
              onChange={(e) => setNewEng(e.target.value)}
              required
              className="input-field"
            />
            <input 
              type="text" 
              placeholder="Türkçe Anlamı" 
              value={newTr}
              onChange={(e) => setNewTr(e.target.value)}
              required
              className="input-field"
            />
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </form>
      )}

      {words.length === 0 ? (
        <div className="add-word-section glass-panel">
          <h2>Havuzun şu an boş</h2>
          <p>Hemen 'Kelime Öğren' modülüne giderek çalışmak istediğin kelimeleri buraya ekle!</p>
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="add-word-section glass-panel">
          <h2>Sonuç Bulunamadı</h2>
          <p>"{searchTerm}" kelimesi ile eşleşen bir sonuç yok.</p>
        </div>
      ) : (
        <div className="words-list">
          {filteredWords.map((word) => (
            <div key={word.id} className="word-card glass-panel">
              <div className="word-info">
                <h3 className="word-eng">{word.eng}</h3>
                <p className="word-tr">{word.tr}</p>
              </div>
              
              <div className="word-actions">
                <button className="action-btn speak-btn" onClick={() => speakWord(word.eng)}>
                  <Volume2 size={20} />
                </button>
                <button className="action-btn success-btn" onClick={() => markAsLearned(word.id)} title="Öğrendim">
                  <CheckCircle size={20} />
                </button>
                <button className="action-btn danger-btn" onClick={() => deleteWord(word.id)} title="Sil">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
          {filteredWords.length >= visibleCount && (
            <div ref={observerTarget} style={{ height: '20px', width: '100%' }}></div>
          )}
        </div>
      )}
    </div>
  );
}
