'use client';

import { useState, useEffect } from 'react';
import { Volume2, PlusCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { speakWord } from '../../lib/tts';
import './words.css';

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function WordsPage() {
  const [selectedLevel, setSelectedLevel] = useState('A1');
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedWords, setAddedWords] = useState(new Set());
  const { user } = useAuth();

  useEffect(() => {
    fetchWords();
  }, [selectedLevel]);

  const fetchWords = async () => {
    setLoading(true);
    setAddedWords(new Set()); // Reset added words UI state when level changes
    try {
      const response = await fetch(`https://raw.githubusercontent.com/ymsalih/english-words-api/main/${selectedLevel}.json`);
      if (response.ok) {
        const data = await response.json();
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
    
    try {
      await addDoc(collection(db, 'users', user.uid, 'words'), {
        eng: word.eng,
        tr: word.tr,
        timestamp: serverTimestamp(),
        isLearned: false,
        lastReviewed: new Date(0)
      });
      setAddedWords(new Set([...addedWords, word.eng]));
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
          {levels.map(level => (
            <button 
              key={level} 
              className={`level-btn ${selectedLevel === level ? 'active' : ''}`}
              onClick={() => setSelectedLevel(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </header>

      <div className="words-grid">
        {words.map((word) => {
          const isAdded = addedWords.has(word.eng);
          return (
            <div key={word.eng} className="package-word-card glass-panel">
              <div className="level-badge-container">
                <div className="level-badge">
                  {selectedLevel}
                </div>
              </div>
              
              <div className="package-word-info">
                <h3 className="package-word-eng">{word.eng}</h3>
                <p className="package-word-tr">{word.tr}</p>
              </div>

              <div className="package-word-actions">
                <button 
                  className="action-btn speak-btn" 
                  onClick={(e) => { e.stopPropagation(); speakWord(word.eng); }}
                  title="Dinle"
                >
                  <Volume2 size={20} />
                </button>
                <button 
                  className={`action-btn ${isAdded ? 'success-btn' : 'add-btn'}`} 
                  onClick={(e) => addToPool(e, word)}
                  disabled={isAdded}
                  title={isAdded ? "Havuzda" : "Havuza Ekle"}
                >
                  {isAdded ? <CheckCircle size={20} /> : <PlusCircle size={20} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
