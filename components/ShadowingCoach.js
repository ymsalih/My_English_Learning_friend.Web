'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, RefreshCw, CheckCircle, Volume2 } from 'lucide-react';
import { speakWord } from '../lib/tts';

// Levenshtein distance string similarity
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

const defaultSentences = [
  "Hello, how are you today?",
  "I would like to order a cup of coffee.",
  "It's a beautiful day outside.",
  "Could you please repeat that?",
  "I am learning English every day."
];

export default function ShadowingCoach() {
  const { user, isPro, userData } = useAuth();
  const router = useRouter();
  
  const [targetSentence, setTargetSentence] = useState(defaultSentences[0]);
  const [customSentence, setCustomSentence] = useState('');
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState('');
  
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
        setScore(null);
        setFeedback('');
      };

      recognition.onresult = (event) => {
        const current = event.resultIndex;
        const resultText = event.results[current][0].transcript;
        setTranscript(resultText);
        calculateScore(resultText);
      };

      recognition.onerror = (event) => {
        // console.warn ile yazdırıyoruz ki Next.js bunu büyük bir kırmız ekran (crash) gibi algılamasın.
        console.warn("Speech recognition info:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setFeedback('Mikrofon izni reddedildi. Lütfen tarayıcı ayarlarından mikrofona izin verin.');
        } else if (event.error === 'no-speech') {
          setFeedback('Ses algılanamadı. Lütfen mikrofona daha yakın konuşun.');
        } else {
          setFeedback(`Bir sorun oluştu: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [targetSentence]); // Re-initialize if needed

  const checkLimitsAndStart = async () => {
    if (!user) return;
    
    if (!recognitionRef.current) {
      alert("Tarayıcınız ses tanıma özelliğini desteklemiyor. Lütfen Chrome kullanın.");
      return;
    }

    // Limit check for free users
    if (!isPro && userData) {
      const today = new Date().toISOString().split('T')[0];
      const lastDate = userData.lastShadowingDate || '';
      let currentCount = userData.dailyShadowingCount || 0;
      
      if (lastDate !== today) {
        currentCount = 0;
      }
      
      if (currentCount >= 3) {
        alert("Ücretsiz planda günde sadece 3 kez telaffuz testi yapabilirsiniz. Sınırsız pratik için Pro'ya geçin!");
        router.push('/pricing');
        return;
      }
      
      // Update count
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          dailyShadowingCount: currentCount + 1,
          lastShadowingDate: today
        });
      } catch (e) {
        console.error(e);
      }
    }

    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error(e);
    }
  };

  const calculateScore = (spokenText) => {
    const sim = similarity(targetSentence, spokenText);
    const percentage = Math.round(sim * 100);
    setScore(percentage);
    
    if (percentage >= 90) {
      setFeedback('Harika! Anadilin gibi konuştun. 🌟');
    } else if (percentage >= 70) {
      setFeedback('Çok iyi! Küçük pürüzler var ama gayet anlaşılır. 👍');
    } else if (percentage >= 50) {
      setFeedback('Fena değil! Biraz daha pratik yapmalısın. 🔄');
    } else {
      setFeedback('Anlaşılması güç oldu. Sesi dinleyip tekrar etmeyi dene! 🎧');
    }
  };

  const handleCustomSentenceAdd = (e) => {
    e.preventDefault();
    if (customSentence.trim()) {
      setTargetSentence(customSentence.trim());
      setCustomSentence('');
      setScore(null);
      setTranscript('');
      setFeedback('');
    }
  };

  return (
    <div className="glass-panel" style={{marginTop: '30px', padding: '25px', borderRadius: '16px'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px'}}>
        <Mic color="var(--primary)" size={28} />
        <h2 style={{color: 'var(--foreground)', margin: 0}}>Telaffuz Koçu (Shadowing)</h2>
      </div>
      
      <p style={{color: 'var(--text-muted)', marginBottom: '20px'}}>
        Videoda duyduğun bir cümleyi veya kendi cümleni buraya yaz, mikrofona oku ve telaffuzunu anında puanlayalım!
      </p>

      <div style={{display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap'}}>
        <select 
          className="input-field" 
          style={{flex: 1, minWidth: '200px'}}
          value={defaultSentences.includes(targetSentence) ? targetSentence : ''}
          onChange={(e) => {
            if(e.target.value) {
              setTargetSentence(e.target.value);
              setScore(null);
              setTranscript('');
            }
          }}
        >
          <option value="" disabled>Örnek Cümle Seç</option>
          {defaultSentences.map((s, i) => (
            <option key={i} value={s}>{s}</option>
          ))}
          {!defaultSentences.includes(targetSentence) && (
            <option value={targetSentence}>{targetSentence}</option>
          )}
        </select>
        
        <form onSubmit={handleCustomSentenceAdd} style={{display: 'flex', gap: '10px', flex: 2, minWidth: '300px'}}>
          <input 
            type="text" 
            placeholder="Veya kendi cümleni yaz..." 
            className="input-field" 
            style={{flex: 1}}
            value={customSentence}
            onChange={(e) => setCustomSentence(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">Ayarla</button>
        </form>
      </div>

      <div style={{background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px'}}>
          
          <div style={{flex: 1, minWidth: '250px'}}>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '5px'}}>Hedef Cümle:</p>
            <h3 style={{fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '15px'}}>{targetSentence}</h3>
            
            <button 
              className="btn btn-secondary" 
              onClick={() => speakWord(targetSentence)}
              style={{display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', fontSize: '0.85rem'}}
            >
              <Volume2 size={16} /> Doğrusunu Dinle
            </button>
          </div>

          <div style={{textAlign: 'center', flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <button 
              onClick={isListening ? () => recognitionRef.current?.stop() : checkLimitsAndStart}
              style={{
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: isListening ? '#ef4444' : 'var(--primary)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 4px 15px rgba(99, 102, 241, 0.4)',
                transition: 'all 0.3s ease',
                transform: isListening ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              {isListening ? <MicOff size={32} /> : <Mic size={32} />}
            </button>
            <p style={{marginTop: '15px', color: isListening ? '#ef4444' : 'var(--text-muted)', fontWeight: isListening ? 'bold' : 'normal'}}>
              {isListening ? 'Sizi Dinliyorum...' : 'Konuşmak için tıkla'}
            </p>
          </div>
          
        </div>

        {(transcript || score !== null) && (
          <div style={{marginTop: '30px', paddingTop: '20px', borderTop: '1px dashed rgba(255,255,255,0.1)'}}>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '5px'}}>Senin Söylediğin:</p>
            <p style={{fontSize: '1.2rem', color: 'var(--foreground)', marginBottom: '15px', fontStyle: 'italic'}}>"{transcript || '...'}"</p>
            
            {score !== null && (
              <div style={{display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px'}}>
                <div style={{
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: score >= 90 ? 'var(--success)' : score >= 70 ? '#f59e0b' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  %{score}
                </div>
                <div>
                  <h4 style={{margin: '0 0 5px 0', color: 'var(--foreground)'}}>Telaffuz Skorun</h4>
                  <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem'}}>{feedback}</p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
