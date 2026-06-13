'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { CheckCircle, Volume2, Sparkles, Languages } from 'lucide-react';
import { speakWord, stopSpeech } from '../../lib/tts';
import '../my-pool/pool.css';

export default function StoryPage() {
  const { user, isPro, userData } = useAuth();
  const router = useRouter();
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [storyText, setStoryText] = useState('');
  const [generatingStory, setGeneratingStory] = useState(false);
  const [storyWords, setStoryWords] = useState([]);
  const [selectedWordIds, setSelectedWordIds] = useState([]);
  
  // Translation
  const [translatedText, setTranslatedText] = useState('');
  const [translating, setTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const [visibleCount, setVisibleCount] = useState(20);
  const observerTarget = useRef(null);

  useEffect(() => {
    if (!user) return;

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

  // Clean up speech when leaving the page
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const toggleWordSelection = (wordId) => {
    setSelectedWordIds(prev => {
      if (prev.includes(wordId)) {
        return prev.filter(id => id !== wordId);
      } else {
        if (prev.length >= 5) {
          alert("En fazla 5 kelime seçebilirsiniz!");
          return prev;
        }
        return [...prev, wordId];
      }
    });
  };

  const handleTranslate = async () => {
    if (!storyText || storyText.includes('Hata:')) return;
    
    if (showTranslation && translatedText) {
      setShowTranslation(false);
      return;
    }
    
    if (translatedText) {
      setShowTranslation(true);
      return;
    }

    setTranslating(true);
    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(storyText)}&langpair=en|tr`);

      if (!response.ok) {
        alert("Çeviri sunucusuna ulaşılamıyor. Lütfen daha sonra tekrar deneyin.");
        setTranslating(false);
        return;
      }

      const data = await response.json();
      if (data.responseData && data.responseData.translatedText) {
        setTranslatedText(data.responseData.translatedText);
        setShowTranslation(true);
      } else {
        alert("Çeviri başarısız oldu. Lütfen tekrar deneyin.");
      }
    } catch (error) {
      console.error(error);
      alert("Çeviri sunucusuna bağlanılamadı. Lütfen internetinizi kontrol edip tekrar deneyin.");
    } finally {
      setTranslating(false);
    }
  };

  const handleGenerateStory = async () => {
    if (selectedWordIds.length === 0) {
      alert("Lütfen hikaye için en az 1 kelime seçin.");
      return;
    }
    
    const selectedEngWords = words.filter(w => selectedWordIds.includes(w.id)).map(w => w.eng);
    
    // Check limits
    if (!isPro && userData) {
      const today = new Date().toISOString().split('T')[0];
      const lastStoryDate = userData.lastStoryDate || '';
      let currentCount = userData.dailyStoryCount || 0;
      
      if (lastStoryDate !== today) {
        currentCount = 0;
      }
      
      if (currentCount >= 1) {
        alert("Ücretsiz planda günde sadece 1 hikaye yaratabilirsiniz. Sınırsız hikaye için Pro'ya geçin!");
        router.push('/pricing');
        return;
      }
      
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          dailyStoryCount: currentCount + 1,
          lastStoryDate: today
        });
      } catch(e) {
        console.error("Sayaç hatası:", e);
      }
    }

    setStoryWords(selectedEngWords);
    setGeneratingStory(true);
    setStoryText('');
    setTranslatedText('');
    setShowTranslation(false);
    stopSpeech(); // Stop any ongoing speech when generating new story

    try {
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: selectedEngWords })
      });
      
      if (!response.ok) {
        const errText = await response.text();
        setStoryText(`Hata: ${errText}`);
        setGeneratingStory(false);
        return;
      }

      setGeneratingStory(false);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = '';
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          fullText += decoder.decode(value, { stream: true });
          setStoryText(fullText);
        }
      }
    } catch (error) {
      console.error(error);
      setStoryText('Sistemsel bir hata oluştu.');
      setGeneratingStory(false);
    }
  };

  if (loading) {
    return <div className="pool-container loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="pool-container animate-fade-in">
      <header className="page-header" style={{marginBottom: '20px'}}>
        <h1>Yapay Zeka <span className="highlight">Hikaye</span></h1>
        <p>Havuzundaki kelimelerden en fazla 5 tanesini seç ve Gemini senin için harika bir hikaye yazsın.</p>
        
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleGenerateStory}
            disabled={selectedWordIds.length === 0 || generatingStory}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: selectedWordIds.length > 0 ? 'var(--primary)' : 'var(--bg-card)', 
              color: selectedWordIds.length > 0 ? 'white' : 'var(--text-muted)', 
              border: selectedWordIds.length > 0 ? 'none' : '1px solid var(--border-color)' 
            }}
          >
            <Sparkles size={18} /> Hikayeyi Oluştur ({selectedWordIds.length}/5)
          </button>
          <button className="btn btn-secondary" onClick={() => setSelectedWordIds([])} disabled={selectedWordIds.length === 0}>Temizle</button>
        </div>
      </header>

      <div className="story-layout" style={{display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap'}}>
        
        {/* Left Side: Word Selection */}
        <div className="story-sidebar" style={{flex: '1', minWidth: 'min(300px, 100%)'}}>
          <div style={{background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '15px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center'}}>
            <h3 style={{color: 'var(--primary)', marginBottom: '5px'}}>Hikaye için kelime seçin</h3>
            <p style={{color: 'var(--text-muted)'}}>Kelimelere tıklayarak seçin.</p>
          </div>

          {words.length === 0 ? (
            <div className="add-word-section glass-panel">
              <h2>Havuzun boş</h2>
              <p>Kelime havuzuna kelime ekledikten sonra burada hikaye yaratabilirsin!</p>
            </div>
          ) : (
            <div className="words-list">
              {words.map((word) => (
                <div 
                  key={word.id} 
                  className="word-card glass-panel" 
                  style={{
                    cursor: 'pointer',
                    border: selectedWordIds.includes(word.id) ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    transform: selectedWordIds.includes(word.id) ? 'translateY(-2px)' : 'none',
                    boxShadow: selectedWordIds.includes(word.id) ? '0 8px 24px rgba(99, 102, 241, 0.2)' : 'none',
                    marginBottom: '10px'
                  }}
                  onClick={() => toggleWordSelection(word.id)}
                >
                  <div className="word-info">
                    <h3 className="word-eng">{word.eng}</h3>
                    <p className="word-tr">{word.tr}</p>
                  </div>
                  
                  {selectedWordIds.includes(word.id) && (
                    <div style={{color: 'var(--primary)', padding: '10px'}}>
                      <CheckCircle size={24} />
                    </div>
                  )}
                </div>
              ))}
              {words.length >= visibleCount && (
                <div ref={observerTarget} style={{ height: '40px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1rem' }}>
                  <div className="spinner" style={{width: '24px', height: '24px'}}></div>
                  <span style={{marginLeft: '10px', color: 'var(--text-muted)', fontSize: '0.9rem'}}>Daha fazla yükleniyor...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Generated Story */}
        {(storyText || generatingStory) && (
          <div className="glass-panel story-content" style={{flex: '1.5', minWidth: 'min(300px, 100%)'}}>
            <h2 style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'15px', color:'var(--foreground)'}}>
              <Sparkles color="var(--primary)"/> Yapay Zeka Hikayeniz
            </h2>
            
            <p style={{color:'var(--text-muted)', marginBottom:'20px', fontSize:'0.95rem'}}>
              Kullanılan kelimeler: <br/>
              {storyWords.map((w, i) => <strong key={i} style={{color:'var(--primary)'}}>{w}{i < storyWords.length - 1 ? ', ' : ''}</strong>)}
            </p>
            
            <div style={{background:'var(--bg-card)', padding:'20px', borderRadius:'12px', border:'1px solid var(--border-color)'}}>
              {generatingStory ? (
                <div style={{textAlign:'center', padding:'40px 20px'}}>
                  <div className="spinner" style={{margin:'0 auto 20px auto', borderColor:'var(--primary)', borderTopColor:'transparent'}}></div>
                  <p style={{color:'var(--text-muted)'}}>Google Gemini senin için A2/B1 seviyesinde harika bir hikaye yazıyor...</p>
                </div>
              ) : (
                <div>
                  <div style={{lineHeight:'1.7', fontSize:'1.05rem', whiteSpace:'pre-wrap', color:'var(--foreground)'}}>
                    {storyText}
                  </div>
                  
                  {showTranslation && (
                    <div style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed var(--border-color)'}}>
                      <h3 style={{color:'var(--primary)', marginBottom:'10px', fontSize:'1rem'}}>Türkçe Çeviri:</h3>
                      <div style={{lineHeight:'1.7', fontSize:'1rem', whiteSpace:'pre-wrap', color:'var(--text-muted)'}}>
                        {translatedText}
                      </div>
                    </div>
                  )}

                  {storyText && !storyText.includes('Hata') && (
                    <div style={{marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap'}}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={handleTranslate} 
                        disabled={translating}
                        style={{display:'inline-flex', alignItems:'center', gap:'8px', padding:'8px 16px', fontSize:'0.9rem'}}
                      >
                        {translating ? <div className="spinner" style={{width:'16px', height:'16px'}}></div> : <Languages size={16}/>} 
                        {showTranslation ? 'Çeviriyi Gizle' : 'Türkçeye Çevir'}
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => {
                          stopSpeech();
                          speakWord(storyText);
                        }} 
                        style={{display:'inline-flex', alignItems:'center', gap:'8px', padding:'8px 16px', fontSize:'0.9rem'}}
                      >
                        <Volume2 size={16}/> Sesli Dinle
                      </button>
                      <button 
                        className="btn" 
                        onClick={stopSpeech} 
                        style={{display:'inline-flex', alignItems:'center', gap:'8px', padding:'8px 16px', fontSize:'0.9rem', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '20px'}}
                      >
                        Sesi Durdur
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
