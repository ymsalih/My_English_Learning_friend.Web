'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Sparkles, BookOpen, PenTool, Video, Target, ArrowRight, Zap, Camera, Brain, BarChart3, Headphones, CheckCircle2, Newspaper, Star, ShieldCheck, Clock, Quote } from 'lucide-react';
import './landing.css';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-container">
      {/* ===== NAVBAR ===== */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <Link href={user ? "/dashboard" : "/"} style={{textDecoration: 'none'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Image src="/logo.png" alt="Owlish Logo" width={32} height={32} style={{borderRadius: '8px', objectFit: 'cover'}} />
            <span className="nav-logo">Owlish</span>
          </div>
        </Link>
        <div className="nav-cta">
          <Link href="/login" className="nav-cta-link">Giriş Yap</Link>
          <Link href="/login" className="nav-cta-btn">Ücretsiz Başla</Link>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <header className="hero-section">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />

        <div className="hero-badge animate-fade-in">
          <Sparkles size={16} /> Yeni Nesil Dil Öğrenme Ekosistemi
        </div>

        <h1 className="hero-title animate-fade-in" style={{animationDelay: '0.1s'}}>
          İngilizceyi Öğrenmeyin, <span className="highlight">Edinin.</span>
          <br />Yapay Zeka ile Akıcı Konuşun.
        </h1>

        <p className="hero-desc animate-fade-in" style={{animationDelay: '0.2s'}}>
          Sıkıcı gramer kitaplarını unutun. Kendi kelime havuzunuzu oluşturun, size özel AI hikayeler okuyun ve 7/24 aktif yapay zeka koçunuzla gerçek hayat senaryolarında yargılanmadan pratik yapın.
        </p>

        <div className="hero-cta animate-fade-in" style={{animationDelay: '0.3s'}}>
          <Link href="/login" className="btn btn-primary" style={{padding: '1.2rem 3rem', fontSize: '1.15rem'}}>
            Ücretsiz Başla <ArrowRight size={20} />
          </Link>
        </div>
        
        <p className="hero-subtext animate-fade-in" style={{animationDelay: '0.4s', marginTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>
          <ShieldCheck size={16} /> Kredi kartı gerekmez • 30 saniyede kayıt ol
        </p>

        <div className="hero-stats animate-fade-in" style={{animationDelay: '0.45s'}}>
          <div className="hero-stat">
            <span className="hero-stat-value">∞</span>
            <span className="hero-stat-label">Sınırsız Pratik</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">7/24</span>
            <span className="hero-stat-label">AI Etkileşimi</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">%100</span>
            <span className="hero-stat-label">Kişiselleştirilmiş</span>
          </div>
        </div>
      </header>

      {/* ===== VALUE PROPOSITION (BENTO BOX) ===== */}
      <section className="features-section" style={{paddingTop: '2rem'}}>
        <div style={{textAlign: 'center'}}>
          <div className="section-label"><Brain size={16} /> Neden Owlish?</div>
          <h2 className="section-title">Geleneksel Kurslara Son Verin</h2>
          <p className="section-subtitle">Sizin hızınıza ve ilgi alanlarınıza ayak uyduran, ezberi ortadan kaldıran sistem.</p>
        </div>

        <div className="bento-grid">
          <div className="bento-card bento-large glass-panel">
            <div className="bento-icon" style={{color: 'var(--primary)'}}>
              <Target size={32} />
            </div>
            <h3>Sıfır Ezber, Akıllı Tekrar</h3>
            <p>Unutma eğrisini kıran spaced-repetition (aralıklı tekrar) algoritması ile kelimeler kalıcı hafızanıza kazınır. Sadece zorlandığınız kelimeleri tekrar edersiniz, zaman kaybetmezsiniz.</p>
          </div>
          <div className="bento-card glass-panel">
            <div className="bento-icon" style={{color: 'var(--secondary)'}}>
              <BookOpen size={32} />
            </div>
            <h3>Sonsuz Bağlam</h3>
            <p>Sadece kendi eklediğiniz kelimelerden oluşan, size özel üretilmiş kısa AI hikayeler ve diyaloglar okuyun.</p>
          </div>
          <div className="bento-card glass-panel">
            <div className="bento-icon" style={{color: 'var(--accent)'}}>
              <Bot size={32} />
            </div>
            <h3>Yargılanmadan Konuş</h3>
            <p>Hata yapmaktan korkmayın. AI koçunuz sizi dinler, anlar ve nazikçe gramer/telaffuz hatalarınızı düzeltir.</p>
          </div>
        </div>
      </section>

      {/* ===== FEATURE SHOWCASE ===== */}
      <section className="features-section" style={{paddingTop: '2rem'}}>
        <div style={{textAlign: 'center'}}>
          <div className="section-label"><Zap size={16} /> Teknolojiler</div>
          <h2 className="section-title">Gerçek Gelişim İçin Üretildi</h2>
        </div>

        {/* Video Pratik */}
        <div className="showcase-grid reverse">
          <div className="showcase-visual" style={{background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #4c1d95 100%)'}}>
            <div className="showcase-visual-icon">
              <Video size={48} />
            </div>
          </div>
          <div className="showcase-text">
            <span className="badge-tag" style={{background: 'rgba(168,85,247,0.15)', color: '#a855f7'}}>Sürükleyici Medya</span>
            <h3>Duyduğunuzu Anlayın, Shadowing ile Ustalaşın</h3>
            <p>Filmlerden, dizilerden veya YouTube videolarından kesitlerle kulak dolgunluğu kazanın. Konuşmaları birebir tekrar ederek (Shadowing) aksanınızı ve akıcılığınızı anadili İngilizce olanların seviyesine çekin.</p>
            <ul className="showcase-features-list">
              <li><span className="check-icon" style={{background: 'rgba(168,85,247,0.15)', color: '#a855f7'}}>✓</span> Gerçek hayat hızında diyaloglar</li>
              <li><span className="check-icon" style={{background: 'rgba(168,85,247,0.15)', color: '#a855f7'}}>✓</span> Telaffuz ve vurgu pratikleri</li>
              <li><span className="check-icon" style={{background: 'rgba(168,85,247,0.15)', color: '#a855f7'}}>✓</span> Çift dilli interaktif altyazılar</li>
            </ul>
          </div>
        </div>

        {/* Yapay Zeka Sohbet */}
        <div className="showcase-grid">
          <div className="showcase-visual" style={{background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1e40af 100%)'}}>
            <div className="showcase-visual-icon">
              <Bot size={48} />
            </div>
          </div>
          <div className="showcase-text">
            <span className="badge-tag" style={{background: 'rgba(59,130,246,0.15)', color: '#3b82f6'}}>7/24 AI Koç</span>
            <h3>Sanki Karşınızda Özel Öğretmen Varmış Gibi</h3>
            <p>İş mülakatlarına hazırlanın, favori kahvehanenizde sipariş verin veya sadece günlük bir sohbet başlatın. Yapay zeka, seviyenize göre kelime dağarcığını ayarlar ve anlık düzeltmeler sunar.</p>
            <ul className="showcase-features-list">
              <li><span className="check-icon" style={{background: 'rgba(59,130,246,0.15)', color: '#3b82f6'}}>✓</span> Role-play mülakat simülasyonları</li>
              <li><span className="check-icon" style={{background: 'rgba(59,130,246,0.15)', color: '#3b82f6'}}>✓</span> Anında gramer raporları</li>
              <li><span className="check-icon" style={{background: 'rgba(59,130,246,0.15)', color: '#3b82f6'}}>✓</span> Çekinmeden pratik yapma özgürlüğü</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="testimonials-section">
        <div style={{textAlign: 'center'}}>
          <div className="section-label"><Star size={16} /> Kullanıcı Deneyimi</div>
          <h2 className="section-title">Neden Bizi Seçtiler?</h2>
        </div>
        <div className="testimonials-grid">
          <div className="testimonial-card glass-panel">
            <Quote className="quote-icon" size={24} />
            <p>"Yıllardır kelime ezberlemeye çalışıp unutuyordum. AI hikaye özelliği resmen kendi kelimelerimden bana özel bir kitap yazıyor. İnanılmaz!"</p>
            <div className="testimonial-author">
              <div className="author-avatar">A</div>
              <div>
                <strong>Ayşe K.</strong>
                <span>Yazılım Geliştirici</span>
              </div>
            </div>
          </div>
          <div className="testimonial-card glass-panel">
            <Quote className="quote-icon" size={24} />
            <p>"Özel derslere servet ödemekten kurtuldum. Sadece mülakat simülasyonu bile aylık ücretin onlarca katını hak ediyor. Gerçekten harika."</p>
            <div className="testimonial-author">
              <div className="author-avatar" style={{background: 'var(--secondary)'}}>M</div>
              <div>
                <strong>Murat Y.</strong>
                <span>Pazarlama Uzmanı</span>
              </div>
            </div>
          </div>
          <div className="testimonial-card glass-panel">
            <Quote className="quote-icon" size={24} />
            <p>"Kamera çevirisi ile kitap okumak çok keyifli. Bilmediğim kelimeyi çekiyorum, anında havuzuma düşüyor. Sonra o kelimeyle test oluyorum."</p>
            <div className="testimonial-author">
              <div className="author-avatar" style={{background: 'var(--accent)'}}>Z</div>
              <div>
                <strong>Zeynep D.</strong>
                <span>Üniversite Öğrencisi</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section style={{padding: '4rem 2rem 8rem'}}>
        <div className="cta-section">
          <h2 className="cta-title">Bugün Başlayın, Farkı Görün</h2>
          <p className="cta-desc">
            İngilizce öğrenme serüveninizi ertelemeyin. Milyonlarca kelime ve sonsuz AI senaryosu parmaklarınızın ucunda. Hemen ücretsiz hesabınızı oluşturun.
          </p>
          <Link href="/login" className="btn btn-primary" style={{padding: '1.2rem 3rem', fontSize: '1.15rem'}}>
            Ücretsiz Hesap Oluştur <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="landing-footer">
        © 2026 Owlish AI. Tüm hakları saklıdır.
      </footer>
    </div>
  );
}
