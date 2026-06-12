export const speakWord = (text, lang = 'en-US') => {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    
    // Explicitly select an English voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      let voiceToUse = voices.find(v => v.lang === lang && v.name.includes('Google')) ||
                       voices.find(v => v.lang === lang) ||
                       voices.find(v => v.lang.startsWith('en'));
      
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
