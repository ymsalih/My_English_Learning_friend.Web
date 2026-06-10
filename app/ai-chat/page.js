'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Send, Bot, User, Volume2, Info, Crown, Languages, Loader } from 'lucide-react';
import { speakWord } from '../../lib/tts';
import './chat.css';

const scenarios = [
  { id: 'coffee', label: '☕ Kafede Sipariş', prompt: "Sen bir Londralı baristasın. Kullanıcı senden kahve siparişi verecek. Çok doğal ve kısa İngilizce konuş.", suggestions: ["Hi, can I get a medium latte?", "What kind of coffee do you recommend?", "Do you have any vegan milk options?"] },
  { id: 'airport', label: '🛂 Pasaport Kontrol', prompt: "Sen JFK havalimanında sert bir gümrük polisisin. Kullanıcının geliş amacını ve kalacağı yeri sor. Sadece İngilizce.", suggestions: ["Hello, here is my passport.", "I am visiting for tourism.", "I will be staying for one week."] },
  { id: 'hotel', label: '🏨 Otel Girişi', prompt: "Sen lüks bir otelin resepsiyonistisin. Kullanıcı check-in yapmak istiyor. Yardımcı ol. Sadece İngilizce.", suggestions: ["Hi, I have a reservation under the name John.", "What time is breakfast served?", "Can I get a late check-out?"] },
  { id: 'free', label: '💬 Serbest Sohbet', prompt: "Sen nazik ve yardımcı bir yapay zeka İngilizce öğretmenisin. Kullanıcı ile doğal İngilizce sohbet et. Kısa cevaplar ver.", suggestions: ["Hi! Can we practice basic conversation?", "I want to improve my English grammar.", "Let's talk about our favorite movies!"] }
];

export default function AiChatPage() {
  const { user, isPro, userData } = useAuth();
  const router = useRouter();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState(scenarios[0]);
  const [translations, setTranslations] = useState({}); // { msgIndex: { loading: true/false, text: '...' } }
  
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleScenarioChange = (scenario) => {
    if (messages.length > 0) {
      const confirmReset = window.confirm("Senaryoyu değiştirmek mevcut sohbeti temizler. Emin misiniz?");
      if (!confirmReset) return;
    }
    setActiveScenario(scenario);
    setMessages([]);
    setTranslations({});
  };

  const checkLimits = async () => {
    if (!userData) return false;
    
    const today = new Date().toISOString().split('T')[0];
    const lastDate = userData.lastAiDate || '';
    
    let currentCount = userData.dailyAiMessageCount || 0;
    if (lastDate !== today) {
      currentCount = 0; // Yeni gün
    }

    const MAX_FREE = 5;
    const MAX_PRO = 100;
    
    if (!isPro && currentCount >= MAX_FREE) {
      alert("Ücretsiz planda günlük 5 mesaj limitinize ulaştınız. Sınırsız pratik için Premium'a geçin!");
      router.push('/pricing');
      return false;
    }
    
    if (isPro && currentCount >= MAX_PRO) {
      alert("Sistem güvenliği (Rate Limit) gereği günlük 100 mesaj sınırına ulaştınız. Yarın tekrar bekleriz!");
      return false;
    }

    // Limiti aşmadıysa veritabanını güncelle
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        dailyAiMessageCount: currentCount + 1,
        lastAiDate: today
      });
      return true;
    } catch (err) {
      console.error("Sayaç güncellenemedi", err);
      return false;
    }
  };

  const sendMessage = async (eOrText) => {
    if (eOrText?.preventDefault) eOrText.preventDefault();
    
    const textToSend = typeof eOrText === 'string' ? eOrText : input;
    if (!textToSend.trim() || loading || !user) return;

    const canSend = await checkLimits();
    if (!canSend) return;

    const userMessage = textToSend.trim();
    if (typeof eOrText !== 'string') setInput('');
    
    // Add user message to UI
    const newMessages = [...messages, { role: 'user', text: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Prepare history for Gemini format: [{ role: 'user'|'model', parts: [{ text: '...' }] }]
      const formattedHistory = messages.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: formattedHistory,
          systemInstruction: activeScenario.prompt
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API Hatası');
      }

      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      alert('Mesaj gönderilemedi: ' + error.message);
      // Re-add limits if failed? For now keep it simple.
    } finally {
      setLoading(false);
    }
  };

  const handleTranslateMessage = async (text, index) => {
    if (translations[index]?.text) return; // Already translated
    
    setTranslations(prev => ({ ...prev, [index]: { loading: true, text: null } }));
    
    try {
      const PROXY_URL = "https://ceviri-api.vercel.app/api/proxy";
      const response = await fetch(`${PROXY_URL}?service=deepl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: [text], source_lang: 'EN', target_lang: 'TR' })
      });
      
      const data = await response.json();
      if (response.ok && data.translations && data.translations.length > 0) {
        setTranslations(prev => ({ ...prev, [index]: { loading: false, text: data.translations[0].text } }));
      } else {
        throw new Error('Çeviri hatası');
      }
    } catch (error) {
      console.error('Mesaj çeviri hatası:', error);
      setTranslations(prev => ({ ...prev, [index]: { loading: false, text: 'Çeviri başarısız oldu.' } }));
    }
  };

  // Limit display logic
  const today = new Date().toISOString().split('T')[0];
  const lastDate = userData?.lastAiDate || '';
  const currentCount = lastDate === today ? (userData?.dailyAiMessageCount || 0) : 0;
  const maxLimit = isPro ? 100 : 5;

  return (
    <div className="chat-container animate-fade-in">
      <header className="chat-header">
        <h1>Yapay Zeka <span className="highlight">Pratik</span></h1>
        
        {userData && (
          <div className={`limits-banner ${isPro ? 'pro' : ''}`}>
            <span>
              <Info size={16} style={{display: 'inline', verticalAlign: 'text-bottom', marginRight: '5px'}}/> 
              Günlük Mesaj Hakkı: <strong>{currentCount} / {maxLimit}</strong>
            </span>
            {isPro && <span><Crown size={16} style={{display: 'inline', verticalAlign: 'text-bottom'}}/> Güvenlik Limiti</span>}
          </div>
        )}

        <div className="scenarios-grid">
          {scenarios.map(scen => (
            <button 
              key={scen.id} 
              className={`scenario-btn ${activeScenario.id === scen.id ? 'active' : ''}`}
              onClick={() => handleScenarioChange(scen)}
            >
              {scen.label}
            </button>
          ))}
        </div>
      </header>

      <div className="chat-window glass-panel">
        <div className="messages-area">
          {messages.length === 0 && !loading && (
            <div className="empty-state" style={{margin: 'auto', textAlign: 'center', opacity: 0.8, maxWidth: '600px'}}>
              <Bot size={64} style={{marginBottom: '1rem', color: 'var(--primary)'}} />
              <h3 style={{marginBottom: '0.5rem'}}>{activeScenario.label} Senaryosuna Hoş Geldiniz!</h3>
              <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>Aşağıdaki hazır cümlelerden birini seçerek hemen sohbete başlayabilirsiniz:</p>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {activeScenario.suggestions.map((sug, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => sendMessage(sug)}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', 
                      padding: '12px 16px', borderRadius: '12px', color: 'var(--foreground)',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  >
                    "{sug}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`message-wrapper ${msg.role}`}>
              <div className="message-bubble">
                <div style={{fontWeight: 'bold', fontSize: '0.8rem', opacity: 0.7, marginBottom: '4px'}}>
                  {msg.role === 'user' ? 'Siz' : 'AI Asistan'}
                </div>
                {msg.text}
                
                {/* Gösterilen Çeviri (Varsa) */}
                {translations[index] && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {translations[index].loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Loader size={14} className="animate-spin" /> Çevriliyor...</span>
                    ) : (
                      translations[index].text
                    )}
                  </div>
                )}
                
                <div className="message-actions">
                  <button className="msg-action-btn" onClick={() => speakWord(msg.text)} title="Seslendir">
                    <Volume2 size={16} />
                  </button>
                  {msg.role === 'ai' && (
                    <button className="msg-action-btn" onClick={() => handleTranslateMessage(msg.text, index)} title="Türkçe'ye Çevir">
                      <Languages size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-wrapper ai">
              <div className="message-bubble" style={{display: 'flex', alignItems: 'center'}}>
                <Bot size={16} style={{marginRight: '8px'}}/>
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-area" onSubmit={sendMessage}>
          <input 
            type="text" 
            className="chat-input" 
            placeholder={`${activeScenario.label} için mesajınızı yazın...`} 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="send-btn" disabled={!input.trim() || loading}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
