export const speakWord = (text, lang = 'en-US') => {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    
    // Load settings from localStorage or use defaults
    const rate = parseFloat(localStorage.getItem('tts_rate')) || 1.0;
    const pitch = parseFloat(localStorage.getItem('tts_pitch')) || 1.0;
    
    utterance.rate = rate;
    utterance.pitch = pitch;
    
    window.speechSynthesis.speak(utterance);
  }
};
