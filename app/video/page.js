'use client';

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Video, PlayCircle } from 'lucide-react';
import './video.css';

export default function VideoPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'practice_videos'), (snapshot) => {
      const videoData = [];
      snapshot.forEach((doc) => {
        videoData.push({ docId: doc.id, ...doc.data() });
      });
      setVideos(videoData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching videos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="video-container loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="video-container animate-fade-in">
      <header className="page-header">
        <h1>Video <span className="highlight">Pratik</span></h1>
        <p>İngilizce dinleme becerini geliştirmek için özenle seçilmiş videoları izle.</p>
      </header>

      {selectedVideo ? (
        <div className="video-player-section animate-fade-in">
          <button className="btn btn-outline back-btn" onClick={() => setSelectedVideo(null)}>
            ← Listeye Dön
          </button>
          <div className="video-wrapper glass-panel">
            <iframe 
              width="100%" 
              height="100%" 
              src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`} 
              title={selectedVideo.title}
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
              loading="lazy"
            ></iframe>
          </div>
          <h2 className="player-title">{selectedVideo.title}</h2>
          <p className="player-desc">{selectedVideo.desc}</p>
        </div>
      ) : (
        <>
          {videos.length === 0 ? (
            <div className="empty-state glass-panel">
              <Video size={64} color="#8b5cf6" style={{marginBottom: '1rem'}} />
              <h2>Şu an hiç video yok.</h2>
              <p>Çok yakında harika içerikler eklenecek!</p>
            </div>
          ) : (
            <div className="video-grid">
              {videos.map((video) => (
                <div key={video.docId} className="video-card glass-panel" onClick={() => setSelectedVideo(video)}>
                  <div className="thumbnail-wrapper">
                    <img 
                      src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`} 
                      alt={video.title} 
                      className="thumbnail-img"
                      loading="lazy"
                    />
                    <div className="play-overlay">
                      <PlayCircle size={48} color="white" />
                    </div>
                  </div>
                  <div className="video-info">
                    <h3 className="video-title">{video.title || 'Başlıksız Video'}</h3>
                    <p className="video-desc">{video.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
