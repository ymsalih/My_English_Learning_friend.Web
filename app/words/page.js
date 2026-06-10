'use client';

import { useState, useEffect } from 'react';
import { Volume2, PlusCircle, CheckCircle, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { speakWord } from '../../lib/tts';
import { useRouter } from 'next/navigation';
import './words.css';

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function WordsPage() {
  const [selectedLevel, setSelectedLevel] = useState('A1');
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedWords, setAddedWords] = useState(new Set());
  const { user, isPro, userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = onSnapshot(collection(db, 'users', user.uid, 'words'), (snapshot) => {
      const existingWords = new Set();
      snapshot.forEach(doc => {
        existingWords.add(doc.data().eng);
      });
      setAddedWords(existingWords);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    fetchWords();
  }, [selectedLevel]);

  const fetchWords = async () => {
    setLoading(true);
    try {
      // Check memory cache first
      if (window.wordCache && window.wordCache[selectedLevel]) {
        setWords(window.wordCache[selectedLevel].slice(0, 50));
        setLoading(false);
        return;
      }

      // Check session storage
      const sessionData = sessionStorage.getItem(`words_${selectedLevel}`);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        if (!window.wordCache) window.wordCache = {};
        window.wordCache[selectedLevel] = parsed;
        setWords(parsed.slice(0, 50));
        setLoading(false);
        return;
      }

      const response = await fetch(`https://raw.githubusercontent.com/ymsalih/english-words-api/main/${selectedLevel}.json`);
      if (response.ok) {
        const data = await response.json();
        
        // Save to cache
        if (!window.wordCache) window.wordCache = {};
        window.wordCache[selectedLevel] = data.words;
        sessionStorage.setItem(`words_${selectedLevel}`, JSON.stringify(data.words));

        setWords(data.words.slice(0, 50)); // Fetching first 50 for demo to prevent massive arrays
      } else {
        console.error('Failed to fetch words');
      }
    } catch (error) {
      console.error('Error fetching words:', error);
    } finally {
      setLoading(false);
    }
  };





  const addToPool = async (e, word) => {
    e.stopPropagation();
    if (!user) return;
    
    // Kısıtlama Kontrolü (Havuz Limiti)
    if (!isPro && userData) {
      if ((userData.totalWordsAdded || 0) >= 50) {
        alert("Ücretsiz planda kelime havuzunuza en fazla 50 kelime ekleyebilirsiniz. Sınırsız kelime için Pro'ya geçin!");
        router.push('/pricing');
        return;
      }
    }

    try {
      await addDoc(collection(db, 'users', user.uid, 'words'), {
        eng: word.eng,
        tr: word.tr,
        timestamp: serverTimestamp(),
        isLearned: false,
        lastReviewed: new Date(0)
      });
      
      // Başarılıysa sayacı 1 artır
      if (!isPro) {
        await updateDoc(doc(db, 'users', user.uid), {
          totalWordsAdded: increment(1)
        });
      }

      // onSnapshot will automatically update addedWords, no need to manually set it here
    } catch (error) {
      console.error('Error adding word to pool:', error);
    }
  };

  if (loading) {
    return <div className="words-container loading-state"><div className="spinner"></div></div>;
  }

  if (words.length === 0) {
    return <div className="words-container"><p>Bu seviyede kelime bulunamadı.</p></div>;
  }



  return (
    <div className="words-container animate-fade-in">
      <header className="page-header">
        <h1>Kelime <span className="highlight">Paketleri</span></h1>
        <p>Seviyene uygun kelimeleri keşfet ve "Havuza Ekle" butonuyla kendi test havuzuna gönder.</p>
        
        <div className="level-selector">
          {levels.map(level => {
            const isLocked = !isPro && ['B1', 'B2', 'C1', 'C2'].includes(level);
            return (
              <button 
                key={level} 
                className={`level-btn ${selectedLevel === level ? 'active' : ''}`}
                style={isLocked ? { opacity: 0.6 } : {}}
                onClick={() => {
                  setSelectedLevel(level);
                }}
              >
                {level} {isLocked && <Lock size={14} style={{marginLeft: '4px', verticalAlign: 'middle'}} />}
              </button>
            );
          })}
        </div>
      </header>

      <div className="words-grid">
        {words.map((word) => {
          const isAdded = addedWords.has(word.eng);
          const isLockedLevel = !isPro && ['B1', 'B2', 'C1', 'C2'].includes(selectedLevel);
          
          return (
            <div key={word.eng} className="package-word-card glass-panel" style={isLockedLevel ? { opacity: 0.5 } : {}}>
              <div className="level-badge-container">
                <div className="level-badge">
                  {selectedLevel}
                </div>
              </div>
              
              <div className="package-word-info" style={isLockedLevel ? { userSelect: 'none' } : {}}>
                <h3 className="package-word-eng" style={isLockedLevel ? { filter: 'blur(4px)' } : {}}>{word.eng}</h3>
                <p className="package-word-tr" style={isLockedLevel ? { filter: 'blur(4px)' } : {}}>{word.tr}</p>
              </div>

              <div className="package-word-actions">
                <button 
                  className="action-btn speak-btn" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (isLockedLevel) {
                      router.push('/pricing');
                      return;
                    }
                    speakWord(word.eng); 
                  }}
                  title="Dinle"
                >
                  {isLockedLevel ? <Lock size={20} /> : <Volume2 size={20} />}
                </button>
                <button 
                  className={`action-btn ${isAdded && !isLockedLevel ? 'success-btn' : 'add-btn'}`} 
                  onClick={(e) => {
                    if (isLockedLevel) {
                      router.push('/pricing');
                      return;
                    }
                    addToPool(e, word);
                  }}
                  disabled={isAdded && !isLockedLevel}
                  title={isLockedLevel ? "Premium" : (isAdded ? "Havuzda" : "Havuza Ekle")}
                >
                  {isLockedLevel ? <Lock size={20} /> : (isAdded ? <CheckCircle size={20} /> : <PlusCircle size={20} />)}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
