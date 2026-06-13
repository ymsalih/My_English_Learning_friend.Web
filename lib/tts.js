// Preload voices to fix empty voices array bug on mobile/Safari
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

export const speakWord = (text, lang = 'en-US') => {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang; // Zorunlu dil ayarı
    
    // Explicitly select an English voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // 1. Google/Siri/Samantha gibi iyi bilinen İngilizce sesleri
      // 2. Tam dil eşleşmesi (en-US, en-GB vb.)
      // 3. İçinde 'en' geçen herhangi bir ses
      let voiceToUse = voices.find(v => v.lang.includes('en-') && (v.name.includes('Google') || v.name.includes('Siri') || v.name.includes('Samantha'))) ||
                       voices.find(v => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase()) ||
                       voices.find(v => v.lang.toLowerCase().startsWith('en')) ||
                       voices.find(v => v.name.toLowerCase().includes('english'));
      
      if (voiceToUse) {
        utterance.voice = voiceToUse;
      }
    }
    
    // Load settings from localStorage or use defaults
    const rate = parseFloat(localStorage.getItem('tts_rate')) || 1.0;
    const pitch = parseFloat(localStorage.getItem('tts_pitch')) || 1.0;
    
    utterance.rate = rate;
    utterance.pitch = pitch;
    
    window.speechSynthesis.speak(utterance);
  }
};

export const stopSpeech = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};
