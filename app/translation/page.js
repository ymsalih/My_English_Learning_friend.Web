'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { Camera, Volume2, Plus, ArrowRightLeft, BookOpen, Lightbulb, Quote } from 'lucide-react';
import { speakWord } from '../../lib/tts';
import './translation.css';

export default function TranslationPage() {
  const { user, isPro, userData } = useAuth();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [direction, setDirection] = useState('en-tr'); // en-tr or tr-en
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  
  const [imageUrl, setImageUrl] = useState('');
  const [searchedEnglishWord, setSearchedEnglishWord] = useState('');
  const [groupedMeanings, setGroupedMeanings] = useState([]);
  
  const fileInputRef = useRef(null);
  const PROXY_URL = "https://ceviri-api.vercel.app/api/proxy";

  const handleSwapLanguages = () => {
    setDirection(prev => prev === 'en-tr' ? 'tr-en' : 'en-tr');
    if (translatedText && !translatedText.includes("hata") && !translatedText.includes("bulunamadı")) {
      setInputText(translatedText);
      setTranslatedText(inputText);
    } else {
      setInputText('');
      setTranslatedText('');
    }
    setGroupedMeanings([]);
    setImageUrl('');
    setSearchedEnglishWord('');
  };

  const translateWordType = (type) => {
    if (!type) return "";
    switch (type.toLowerCase()) {
      case 'noun': return 'İsim';
      case 'verb': return 'Fiil';
      case 'adjective': return 'Sıfat';
      case 'adverb': return 'Zarf';
      case 'pronoun': return 'Zamir';
      case 'preposition': return 'Edat';
      case 'conjunction': return 'Bağlaç';
      case 'interjection': return 'Ünlem';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getShortPartSpeech = (trType) => {
    if (!trType) return "";
    switch (trType.toLowerCase()) {
      case 'i̇sim':
      case 'isim': return 'noun';
      case 'sıfat': return 'adj.';
      case 'zarf': return 'adv.';
      case 'fiil': return 'verb';
      case 'zamir': return 'pron.';
      case 'edat': return 'prep.';
      case 'bağlaç': return 'conj.';
      default: return trType.toLowerCase();
    }
  };

  const highlightWordInText = (text, highlightWord) => {
    if (!highlightWord) return text;
    const parts = text.split(new RegExp(`(${highlightWord})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlightWord.toLowerCase() ? 
      <span key={i} className="highlighted-word">{part}</span> : part
    );
  };

  const translateText = async () => {
    const textToTranslate = inputText.trim();
    if (!textToTranslate) return;
    
    setLoading(true);
    setGroupedMeanings([]);
    setImageUrl('');
    setTranslatedText('');
    setSearchedEnglishWord('');

    try {
      const isEnToTr = direction === 'en-tr';
      const sLang = isEnToTr ? 'EN' : 'TR';
      const tLang = isEnToTr ? 'TR' : 'EN-US';
      
      const response = await fetch(`${PROXY_URL}?service=deepl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: [textToTranslate], source_lang: sLang, target_lang: tLang })
      });

      let mainTrans = "";
      if (response.ok) {
        const data = await response.json();
        if (data.translations && data.translations.length > 0) {
          mainTrans = data.translations[0].text;
          setTranslatedText(mainTrans.charAt(0).toUpperCase() + mainTrans.slice(1));
        } else {
          setTranslatedText("Çeviri bulunamadı.");
          setLoading(false);
          return;
        }
      } else {
        setTranslatedText("Çeviri Hatası");
        setLoading(false);
        return;
      }

      // If it's a single word, fetch dictionary data
      const isSingleWord = !textToTranslate.includes(' ');
      if (isSingleWord) {
        const engWord = isEnToTr ? textToTranslate.toLowerCase() : mainTrans.toLowerCase();
        
        // --- ÖNBELLEK KONTROLÜ (CACHE) ---
        try {
          const { getDoc } = await import('firebase/firestore');
          const cacheRef = doc(db, 'dictionary_cache', engWord);
          const cacheSnap = await getDoc(cacheRef);
          
          if (cacheSnap.exists()) {
             const cachedData = cacheSnap.data();
             setSearchedEnglishWord(engWord);
             setImageUrl(cachedData.imageUrl || '');
             setGroupedMeanings(cachedData.groupedMeanings || []);
             setLoading(false);
             return;
          }
        } catch (err) {
          console.error("Önbellek okuma hatası:", err);
        }
        // --- END CACHE ---

        setSearchedEnglishWord(engWord);
        
        let fetchedImageUrl = '';
        try {
          const pRes = await fetch(`${PROXY_URL}?service=pexels&word=${encodeURIComponent(engWord)}`);
          if (pRes.ok) {
            const pData = await pRes.json();
            if (pData.photos && pData.photos.length > 0) {
              fetchedImageUrl = pData.photos[0].src.medium;
              setImageUrl(fetchedImageUrl);
            }
          }
        } catch (error) {
          console.error("Pexels error:", error);
        }

        // Dictionary
        const newGrouped = [];
        if (isEnToTr) {
          const gRes = await fetch(`${PROXY_URL}?service=google&sl=en&tl=tr&word=${encodeURIComponent(engWord)}`);
          let googleMeanings = {};
          if (gRes.ok) {
            const data = await gRes.json();
            if (data && data.length > 1 && data[1]) {
              for (let item of data[1]) {
                let type = translateWordType(item[0]);
                let meanings = item[1].map(e => String(e));
                googleMeanings[type] = meanings;
              }
            }
          }

          const dRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(engWord)}`);
          if (dRes.ok) {
            const data = await dRes.json();
            if (data.length > 0 && data[0].meanings) {
              for (let meaning of data[0].meanings) {
                let partOfSpeech = translateWordType(meaning.partOfSpeech);
                let shortTrMeanings = googleMeanings[partOfSpeech] || [];
                let examples = [];
                
                let defCount = 0;
                for (let def of meaning.definitions) {
                  if (defCount >= 3) break;
                  if (def.example) {
                    const trRes = await fetch(`${PROXY_URL}?service=deepl`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text: [def.example], source_lang: 'EN', target_lang: 'TR' })
                    });
                    if (trRes.ok) {
                      const trData = await trRes.json();
                      if (trData.translations && trData.translations.length > 0) {
                        examples.push({ eng: def.example, tr: trData.translations[0].text });
                        defCount++;
                      }
                    }
                  }
                }

                if (shortTrMeanings.length > 0 || examples.length > 0) {
                  let existing = newGrouped.find(g => g.partOfSpeech === partOfSpeech);
                  if (existing) {
                    existing.contextualExamples.push(...examples);
                  } else {
                    newGrouped.push({ partOfSpeech, shortMeanings: shortTrMeanings, contextualExamples: examples, reverseMeanings: [] });
                  }
                }
              }
            }
          }

          if (newGrouped.length === 0 && Object.keys(googleMeanings).length > 0) {
            for (const [type, meanings] of Object.entries(googleMeanings)) {
              newGrouped.push({ partOfSpeech: type, shortMeanings: meanings, contextualExamples: [], reverseMeanings: [] });
            }
          }
          setGroupedMeanings(newGrouped);
          
        } else {
          // TR -> EN
          const gRes = await fetch(`${PROXY_URL}?service=google&sl=tr&tl=en&word=${encodeURIComponent(textToTranslate.toLowerCase())}`);
          if (gRes.ok) {
            const data = await gRes.json();
            if (data && data.length > 1 && data[1]) {
              for (let item of data[1]) {
                let type = translateWordType(item[0]);
                let reverseList = [];
                if (item.length > 2 && item[2]) {
                  for (let revItem of item[2]) {
                    let eWord = String(revItem[0]);
                    let trWords = revItem[1].map(e => String(e));
                    reverseList.push({ [eWord]: trWords });
                  }
                }
                if (reverseList.length > 0) {
                  newGrouped.push({ partOfSpeech: type, shortMeanings: [], contextualExamples: [], reverseMeanings: reverseList });
                }
              }
            }
          }
          setGroupedMeanings(newGrouped);
        }

        // --- ÖNBELLEĞE KAYDET (CACHE SAVE) ---
        if (newGrouped.length > 0 || fetchedImageUrl) {
          try {
            const { setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, 'dictionary_cache', engWord), {
              imageUrl: fetchedImageUrl,
              groupedMeanings: newGrouped,
              timestamp: serverTimestamp()
            });
          } catch(err) {
            console.error("Önbelleğe yazma hatası:", err);
          }
        }
        // --- END CACHE SAVE ---
      }
    } catch (error) {
      console.error("Translation error:", error);
      setTranslatedText("Sistemsel bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kısıtlama Kontrolü (OCR Limiti)
    if (!isPro && userData) {
      const today = new Date().toISOString().split('T')[0];
      const lastOcrDate = userData.lastOcrDate || '';
      
      let currentCount = userData.dailyOcrCount || 0;
      if (lastOcrDate !== today) {
        currentCount = 0; // Yeni gün, sayaç sıfırlanmış sayılır
      }

      if (currentCount >= 3) {
        alert("Ücretsiz plan için günlük 3 görsel okutma limitinize ulaştınız. Sınırsız kullanım için Pro'ya geçin!");
        router.push('/pricing');
        return;
      }
      
      // Limiti aşmadıysa veritabanını güncelle
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          dailyOcrCount: currentCount + 1,
          lastOcrDate: today
        });
      } catch (err) {
        console.error("Sayaç güncellenemedi", err);
      }
    }

    setOcrLoading(true);
    setInputText("Görsel okunuyor, lütfen bekleyin...");
    
    try {
      const Tesseract = (await import('tesseract.js')).default;
      const result = await Tesseract.recognize(file, 'eng');
      const text = result.data.text.trim();
      setInputText(text);
      if (text) {
        setDirection('en-tr');
      } else {
        setInputText("Metin bulunamadı.");
      }
    } catch (error) {
      console.error("OCR Error:", error);
      setInputText("Görsel okunurken hata oluştu.");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleAddPool = async () => {
    if (!user || !inputText || !translatedText || translatedText.includes("hata") || translatedText.includes("bulunamadı")) return;
    
    // Kısıtlama Kontrolü (Havuz Limiti)
    if (!isPro && userData) {
      if ((userData.totalWordsAdded || 0) >= 50) {
        alert("Ücretsiz planda kelime havuzunuza en fazla 50 kelime ekleyebilirsiniz. Sınırsız kelime için Pro'ya geçin!");
        router.push('/pricing');
        return;
      }
    }

    const eng = direction === 'en-tr' ? inputText : translatedText;
    const tr = direction === 'en-tr' ? translatedText : inputText;

    try {
      await addDoc(collection(db, 'users', user.uid, 'words'), {
        eng: eng.trim(),
        tr: tr.trim(),
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

      alert('Akıllıca havuza eklendi! ✨');
    } catch (error) {
      console.error("Error adding to pool:", error);
      alert('Havuza eklenirken hata oluştu.');
    }
  };

  const hasExamples = groupedMeanings.some(g => g.contextualExamples.length > 0);

  return (
    <div className="translation-container animate-fade-in">
      <header className="page-header">
        <h1>Akıllı <span className="highlight">Çeviri</span></h1>
        <p>İngilizce metinleri veya görsellerdeki yazıları çevir. Detaylı sözlük ile yeni kelimeler öğren!</p>
      </header>

      <div className="translation-panel">
        <div className="direction-control">
          <span className="active">{direction === 'en-tr' ? '🇬🇧 İngilizce' : '🇹🇷 Türkçe'}</span>
          <button className="swap-btn" onClick={handleSwapLanguages} title="Dilleri Değiştir">
            <ArrowRightLeft size={24} />
          </button>
          <span className="active">{direction === 'en-tr' ? '🇹🇷 Türkçe' : '🇬🇧 İngilizce'}</span>
        </div>

        <div className="boxes-container">
          <div className="input-box glass-panel">
            <div className="box-header">
              <span className="lang-label">{direction === 'en-tr' ? 'İngilizce' : 'Türkçe'}</span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={direction === 'en-tr' ? "Çevrilecek metni yazın..." : "Çevrilecek Türkçe metni yazın..."}
              className="text-area"
              disabled={ocrLoading}
            ></textarea>
            
            <div className="box-footer">
              <div className="action-buttons">
                <button className="icon-btn tooltip" onClick={() => speakWord(inputText, direction === 'en-tr' ? 'en-US' : 'tr-TR')}>
                  <Volume2 size={20} />
                  <span className="tooltiptext">Dinle</span>
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  style={{display: 'none'}} 
                  onChange={handleImageUpload} 
                />
                <button className="icon-btn tooltip" onClick={() => fileInputRef.current.click()} disabled={ocrLoading}>
                  <Camera size={20} />
                  <span className="tooltiptext">Kameradan Oku</span>
                </button>
              </div>
            </div>
          </div>

          <div className="action-center">
            <button className="translate-btn" onClick={translateText} disabled={loading || ocrLoading || !inputText.trim()}>
              {loading ? 'Çevriliyor...' : 'Akıllı Çeviri ✨'}
            </button>
          </div>

          <div className="output-box glass-panel">
            <div className="box-header">
              <span className="lang-label">{direction === 'en-tr' ? 'Türkçe' : 'İngilizce'}</span>
            </div>
            <div className="text-area readonly">
              {translatedText || "Çeviri sonucu burada görünecek."}
            </div>
            
            {translatedText && !translatedText.includes("Hata") && !translatedText.includes("bulunamadı") && (
              <div className="box-footer">
                <div className="action-buttons">
                  <button className="icon-btn tooltip" onClick={() => speakWord(translatedText, direction === 'en-tr' ? 'tr-TR' : 'en-US')}>
                    <Volume2 size={20} />
                    <span className="tooltiptext">Dinle</span>
                  </button>
                  <button className="icon-btn tooltip add-btn" onClick={handleAddPool}>
                    <Plus size={20} />
                    <span className="tooltiptext">Havuza Ekle</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Eski Şık Alt Sözlük Kartı Yapısına Geri Dönüş */}
        {translatedText && !translatedText.includes("Hata") && !translatedText.includes("bulunamadı") && (imageUrl || groupedMeanings.length > 0) && (
          <div className="dictionary-card animate-fade-in">
            {imageUrl && (
              <div className="word-image">
                <Image src={imageUrl} alt="Context" width={400} height={250} style={{objectFit: 'cover', width: '100%', height: 'auto', borderRadius: '12px'}} />
              </div>
            )}
            
            <div className="word-info">
              <h3>
                <BookOpen size={24} style={{marginRight: '10px', color: 'var(--primary)'}} />
                {direction === 'en-tr' ? inputText.toLowerCase() : translatedText.toLowerCase()}
              </h3>
              
              {/* EN -> TR Kısa Anlamlar */}
              {direction === 'en-tr' && groupedMeanings.length > 0 && (
                <div className="meanings">
                  {groupedMeanings.map((group, idx) => {
                    if (group.shortMeanings.length === 0) return null;
                    return (
                      <div key={idx} className="meaning-group">
                        <span className="part-of-speech">({getShortPartSpeech(group.partOfSpeech)})</span>
                        <p className="definition">{group.shortMeanings.join(', ')}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TR -> EN Ters Anlamlar */}
              {direction === 'tr-en' && groupedMeanings.length > 0 && (
                <div className="meanings">
                  <div className="meaning-group" style={{border: 'none'}}>
                    <span className="part-of-speech" style={{backgroundColor: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)'}}>
                      <Lightbulb size={14} style={{marginRight: '5px', verticalAlign: 'middle'}}/> Alternatif Çeviriler
                    </span>
                    {groupedMeanings.map((group, idx) => {
                      if (group.reverseMeanings.length === 0) return null;
                      return (
                        <div key={idx} style={{marginBottom: '1rem'}}>
                          <div style={{color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem'}}>
                            {group.partOfSpeech.toLowerCase()}
                          </div>
                          {group.reverseMeanings.map((rev, rIdx) => {
                            const engWord = Object.keys(rev)[0];
                            const trMeanings = rev[engWord];
                            return (
                              <div key={rIdx} style={{borderLeft: '2px solid var(--primary)', paddingLeft: '1rem', marginBottom: '1rem'}}>
                                <p style={{color: 'var(--foreground)', fontWeight: 700, margin: '0 0 0.25rem 0', fontSize: '1.1rem'}}>{engWord}</p>
                                <p style={{color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem'}}>{trMeanings.join(', ')}</p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Örnek Cümleler (Bağlam) */}
              {direction === 'en-tr' && hasExamples && (
                <div className="meanings" style={{marginTop: '2rem'}}>
                  <span className="part-of-speech" style={{backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)'}}>
                    <Quote size={14} style={{marginRight: '5px', verticalAlign: 'middle'}}/> Örnek Cümleler
                  </span>
                  {groupedMeanings.filter(g => g.contextualExamples.length > 0).map((group, idx) => (
                    <div key={`ex-${idx}`} className="meaning-group" style={{borderBottom: 'none'}}>
                      {group.contextualExamples.map((ex, eIdx) => (
                        <div key={eIdx} style={{marginBottom: '1.5rem'}}>
                          <p className="definition" style={{fontSize: '1.05rem', fontWeight: 600}}>
                            {highlightWordInText(ex.eng, searchedEnglishWord)}
                          </p>
                          <p className="example" style={{fontSize: '0.95rem'}}>
                            {ex.tr}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
