'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Headphones, Volume2, CheckCircle, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { speakWord, stopSpeech } from '../../lib/tts';
import Link from 'next/link';
import './listening.css';

const practiceSentences = [
  "I have been working on this project for three months.",
  "What time does the train leave for the city center?",
  "She usually drinks a cup of coffee in the morning.",
  "They are planning to travel to Japan next summer.",
  "Could you please explain that to me once again?",
  "The weather is surprisingly warm for this time of year.",
  "I would like to make a reservation for two people.",
  "He forgot his umbrella so he got completely wet in the rain.",
  "Learning a new language opens up many opportunities.",
  "Have you ever tried eating sushi before?"
];

function similarity(s1, s2) {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  let longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  s2 = s2.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  let costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function evaluateWords(targetStr, typedStr) {
  if (!typedStr) return [];
  const cleanTargetWords = targetStr.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w);
  const typedWords = typedStr.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w);
  const originalTargetWords = targetStr.split(/\s+/).filter(w => w);
  
  let typedIndex = 0;
  return originalTargetWords.map((originalWord, index) => {
    const cleanTarget = cleanTargetWords[index];
    let isCorrect = false;
    
    const maxLookahead = Math.min(typedWords.length, typedIndex + 4);
    for (let i = Math.max(0, typedIndex - 1); i < maxLookahead; i++) {
      // For typing, we want high accuracy (>= 0.8) so typos aren't completely ignored
      if (similarity(cleanTarget, typedWords[i]) >= 0.8) {
        isCorrect = true;
        typedIndex = i + 1;
        break;
      }
    }
    
    return {
      text: originalWord,
      cleanText: cleanTarget,
      isCorrect: isCorrect
    };
  });
}

export default function ListeningPage() {
  const { user, isPro, userData } = useAuth();
  const router = useRouter();
  
  const [targetSentence, setTargetSentence] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEvaluated, setHasEvaluated] = useState(false);
  const [evaluatedWords, setEvaluatedWords] = useState([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    pickRandomSentence();
    return () => stopSpeech();
  }, []);

  const pickRandomSentence = () => {
    const rand = practiceSentences[Math.floor(Math.random() * practiceSentences.length)];
    setTargetSentence(rand);
    setUserInput('');
    setHasEvaluated(false);
    setEvaluatedWords([]);
    setScore(0);
  };

  const handlePlay = () => {
    if (!targetSentence) return;
    setIsPlaying(true);
    speakWord(targetSentence, 'en-US');
    setTimeout(() => setIsPlaying(false), 2000); // Visual effect
  };

  const checkLimitsAndEvaluate = async () => {
    if (!userInput.trim()) return;
    if (!user) return;

    if (!isPro && userData) {
      const today = new Date().toISOString().split('T')[0];
      const lastDate = userData.lastListeningDate || '';
      let currentCount = userData.dailyListeningCount || 0;
      
      if (lastDate !== today) {
        currentCount = 0;
      }
      
      if (currentCount >= 3) {
        alert("Ücretsiz planda günde sadece 3 kez dinleme testi yapabilirsiniz. Sınırsız pratik için Pro'ya geçin!");
        router.push('/pricing');
        return;
      }
      
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          dailyListeningCount: currentCount + 1,
          lastListeningDate: today
        });
      } catch (e) {
        console.error(e);
      }
    }

    // Evaluation
    const evaluated = evaluateWords(targetSentence, userInput);
    setEvaluatedWords(evaluated);
    
    if (evaluated.length > 0) {
      const correctCount = evaluated.filter(w => w.isCorrect).length;
      const pct = Math.round((correctCount / evaluated.length) * 100);
      setScore(pct);
    }
    
    setHasEvaluated(true);
  };

  const isLimitReached = !isPro && userData && (userData.dailyListeningCount || 0) >= 3 && userData.lastListeningDate === new Date().toISOString().split('T')[0];

  return (
    <div className="listening-container animate-fade-in">
      <div className="listening-header">
        <h1><Headphones size={36} /> Ne Duyduğunu Yaz</h1>
        <p>Dinleme (Listening) becerini test et. Duyduğun cümleyi eksiksiz yazmaya çalış.</p>
      </div>

      <div className="listening-card">
        <button 
          className={`play-button ${isPlaying ? 'playing' : ''}`} 
          onClick={handlePlay}
          title="Dinle"
        >
          <Volume2 size={48} />
        </button>

        {!hasEvaluated ? (
          <div className="input-section">
            <input 
              type="text" 
              className="listen-input" 
              placeholder="Duyduğun İngilizce cümleyi buraya yaz..." 
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkLimitsAndEvaluate()}
              disabled={isLimitReached}
            />
            
            {isLimitReached ? (
              <div className="limits-warning">
                <strong>GÜNLÜK LİMİTE ULAŞTINIZ!</strong> Ücretsiz planda günde 3 kez dinleme testi yapabilirsiniz.
                <br />
                <Link href="/pricing" style={{display: 'inline-block', marginTop: '10px', color: '#ef4444', fontWeight: 'bold', textDecoration: 'underline'}}>Sınırsız Pratik İçin Premium'a Geç</Link>
              </div>
            ) : (
              <button className="check-button" onClick={checkLimitsAndEvaluate} disabled={!userInput.trim()}>
                Kontrol Et
              </button>
            )}
          </div>
        ) : (
          <div className="feedback-section animate-fade-in">
            {score >= 90 ? (
              <h2 className="feedback-title feedback-success"><CheckCircle size={28} /> Harika! Tamamen doğru yazdın.</h2>
            ) : score >= 50 ? (
              <h2 className="feedback-title" style={{color: '#f59e0b'}}><CheckCircle size={28} /> Fena değil, ama hataların var.</h2>
            ) : (
              <h2 className="feedback-title feedback-error"><XCircle size={28} /> Anlamakta zorlandın. Tekrar dene!</h2>
            )}

            <div style={{color: 'var(--text-muted)', marginBottom: '10px', fontSize: '0.9rem'}}>Orijinal Cümle:</div>
            
            <div className="word-diff-container">
              {evaluatedWords.map((word, i) => (
                <span 
                  key={i} 
                  className={`word-diff ${word.isCorrect ? 'word-correct' : 'word-wrong'}`}
                  title={word.isCorrect ? 'Doğru yazdın' : 'Hatalı yazdın / Kaçırdın'}
                >
                  {word.text}
                </span>
              ))}
            </div>

            <div className="action-buttons">
              <button className="btn btn-secondary" onClick={handlePlay}>
                <Volume2 size={20} /> Tekrar Dinle
              </button>
              <button className="btn btn-primary" onClick={pickRandomSentence}>
                <RefreshCw size={20} /> Sonraki Cümle
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
