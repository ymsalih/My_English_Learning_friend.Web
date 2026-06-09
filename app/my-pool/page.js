'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle, Trash2, Volume2, Plus, Search } from 'lucide-react';
import { speakWord } from '../../lib/tts';
import './pool.css';

export default function MyPoolPage() {
  const { user } = useAuth();
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newEng, setNewEng] = useState('');
  const [newTr, setNewTr] = useState('');
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'words'),
      where('isLearned', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const wordsData = [];
      snapshot.forEach((doc) => {
        // Handle pending serverTimestamps by estimating them or defaulting to current time
        const data = doc.data({ serverTimestamps: 'estimate' });
        wordsData.push({ id: doc.id, ...data });
      });
      
      // Sort descending by timestamp (newest first)
      wordsData.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });

      setWords(wordsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Removed local speakWord

  const markAsLearned = async (wordId) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'words', wordId), {
        isLearned: true
      });
    } catch (error) {
      console.error("Error updating document: ", error);
      alert("Kelime güncellenirken hata oluştu: " + error.message);
    }
  };

  const deleteWord = async (wordId) => {
    if (!user) return;
    if (window.confirm('Bu kelimeyi havuzdan silmek istediğinize emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'words', wordId));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Kelime silinirken hata oluştu: " + error.message);
      }
    }
  };

  const handleAddWord = async (e) => {
    e.preventDefault();
    if (!user || !newEng.trim() || !newTr.trim()) return;
    
    setAdding(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'words'), {
        eng: newEng.trim(),
        tr: newTr.trim(),
        timestamp: serverTimestamp(),
        isLearned: false,
        lastReviewed: new Date(0)
      });
      setNewEng('');
      setNewTr('');
      setShowForm(false);
    } catch (error) {
      console.error("Error adding word:", error);
      alert("Kelime eklenirken hata oluştu: " + error.message);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <div className="pool-container loading"><div className="spinner"></div></div>;
  }

  const filteredWords = words.filter(word => 
    word.eng.toLowerCase().includes(searchTerm.toLowerCase()) || 
    word.tr.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pool-container animate-fade-in">
      <header className="page-header">
        <h1>Kelime <span className="highlight">Havuzum</span></h1>
        <p>Paketlerden eklediğin veya manuel girdiğin kelimeler burada birikir. Öğrendiğin kelimeleri işaretle.</p>
        <button 
          className="btn btn-primary" 
          style={{marginTop: '1rem'}} 
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Kapat' : '+ Manuel Kelime Ekle'}
        </button>
      </header>

      {/* Search Bar */}
      {words.length > 0 && (
        <div className="search-bar-container glass-panel">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            placeholder="İngilizce veya Türkçe kelime ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAddWord} className="add-word-section glass-panel">
          <div className="form-group">
            <input 
              type="text" 
              placeholder="İngilizce Kelime" 
              value={newEng}
              onChange={(e) => setNewEng(e.target.value)}
              required
              className="input-field"
            />
            <input 
              type="text" 
              placeholder="Türkçe Anlamı" 
              value={newTr}
              onChange={(e) => setNewTr(e.target.value)}
              required
              className="input-field"
            />
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </form>
      )}

      {words.length === 0 ? (
        <div className="add-word-section glass-panel">
          <h2>Havuzun şu an boş</h2>
          <p>Hemen 'Kelime Öğren' modülüne giderek çalışmak istediğin kelimeleri buraya ekle!</p>
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="add-word-section glass-panel">
          <h2>Sonuç Bulunamadı</h2>
          <p>"{searchTerm}" kelimesi ile eşleşen bir sonuç yok.</p>
        </div>
      ) : (
        <div className="words-list">
          {filteredWords.map((word) => (
            <div key={word.id} className="word-card glass-panel">
              <div className="word-info">
                <h3 className="word-eng">{word.eng}</h3>
                <p className="word-tr">{word.tr}</p>
              </div>
              
              <div className="word-actions">
                <button className="action-btn speak-btn" onClick={() => speakWord(word.eng)}>
                  <Volume2 size={20} />
                </button>
                <button className="action-btn success-btn" onClick={() => markAsLearned(word.id)} title="Öğrendim">
                  <CheckCircle size={20} />
                </button>
                <button className="action-btn danger-btn" onClick={() => deleteWord(word.id)} title="Sil">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
