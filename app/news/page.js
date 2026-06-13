'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Newspaper, ExternalLink } from 'lucide-react';
import './news.css';

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'news_links'), (snapshot) => {
      const newsData = [];
      snapshot.forEach((doc) => {
        newsData.push({ id: doc.id, ...doc.data() });
      });
      setNews(newsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching news:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="news-container loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="news-container animate-fade-in">
      <header className="page-header">
        <h1>İngilizce <span className="highlight">Haberler</span></h1>
        <p>Güncel haberleri okuyarak okuma becerilerini (Reading) geliştir.</p>
      </header>

      {news.length === 0 ? (
        <div className="empty-state glass-panel">
          <Newspaper size={64} color="var(--primary)" style={{marginBottom: '1rem'}} />
          <h2>Şu an hiç haber yok.</h2>
          <p>Çok yakında güncel haberler eklenecek!</p>
        </div>
      ) : (
        <div className="news-grid">
          {news.map((item) => (
            <a 
              key={item.id} 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="news-card glass-panel"
              style={item.color ? { borderLeftColor: item.color } : {}}
            >
              {item.image && (
                <Image 
                  src={item.image} 
                  alt={item.title || 'Haber Görseli'} 
                  width={400}
                  height={250}
                  style={{objectFit: 'cover', width: '100%', height: '200px'}}
                />
              )}
              <div className="news-content">
                <h3 className="news-title">{item.title || 'Başlıksız Haber'}</h3>
                {item.subtitle && <p className="news-subtitle">{item.subtitle}</p>}
                <div className="read-more" style={item.color ? { color: item.color } : {}}>
                  <span>Haberi Oku</span>
                  <ExternalLink size={16} />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
