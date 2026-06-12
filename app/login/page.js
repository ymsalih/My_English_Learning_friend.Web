'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, User, AlertCircle, Sparkles, Target, Bot, BookOpen, ArrowRight } from 'lucide-react';
import './login.css';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const { login, register, resetPassword, user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (!email.includes('@')) {
        setError('Lütfen geçerli bir e-posta adresi girin.');
        setLoading(false);
        return;
      }

      if (isLogin) {
        await login(email, password);
      } else {
        if (password !== confirmPassword) {
          throw new Error('Şifreler birbiriyle eşleşmiyor.');
        }
        if (username.length < 3) {
          throw new Error('Kullanıcı adı en az 3 karakter olmalıdır.');
        }
        await register(email, password, username);
        setMessage('Kayıt başarılı! Lütfen e-posta adresinize gönderilen doğrulama linkine tıklayın.');
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      let errorMsg = 'Bir hata oluştu.';
      if (err.code === 'auth/invalid-credential') errorMsg = 'E-posta veya şifre hatalı.';
      if (err.code === 'auth/email-already-in-use') errorMsg = 'Bu e-posta adresi zaten kullanımda.';
      if (err.code === 'auth/unverified-email') errorMsg = err.message;
      if (!err.code && err.message) errorMsg = err.message;
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('Lütfen e-posta adresinizi girin.');
      return;
    }
    setLoading(true);
    try {
      if (!resetEmail.includes('@')) {
        setError('Lütfen geçerli bir e-posta adresi girin.');
        setLoading(false);
        return;
      }
      await resetPassword(resetEmail);
      setShowResetModal(false);
      setMessage('Sıfırlama bağlantısı gönderildi. Lütfen mail kutunuzu kontrol edin.');
      setResetEmail('');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('Bu e-posta adresine kayıtlı bir hesap bulunamadı.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Lütfen geçerli bir e-posta adresi girin.');
      } else {
        setError('E-posta gönderilemedi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* ===== LEFT PANEL ===== */}
      <div className="login-left">
        <div className="login-left-content animate-fade-in">
          <Link href={user ? "/dashboard" : "/"} style={{textDecoration: 'none'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3rem'}}>
              <Image src="/logo.png" alt="Owlish Logo" width={40} height={40} style={{borderRadius: '10px', objectFit: 'cover'}} />
              <span className="brand-logo" style={{marginBottom: 0}}>Owlish</span>
            </div>
          </Link>

          <h1>{isLogin ? 'Tekrar Hoş Geldiniz.' : 'Dil Yolculuğunuz Başlıyor.'}</h1>
          <p className="left-desc">
            {isLogin
              ? 'Kelime havuzunuza kaldığınız yerden devam edin, yapay zeka koçunuzla pratik yapın ve ilerlemenizi takip edin.'
              : 'Yapay zeka destekli İngilizce öğrenme platformuyla bugün tanışın. Kelime haznenizi genişletin, özgüvenle konuşun.'}
          </p>

          <div className="login-features">
            <div className="login-feature-item">
              <div className="login-feature-icon" style={{background: 'rgba(59,130,246,0.12)', color: '#3b82f6'}}>
                <Bot size={20} />
              </div>
              <span className="login-feature-text"><strong>AI Koç</strong> — Mülakat simülasyonu ve sohbet pratiği</span>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon" style={{background: 'rgba(245,158,11,0.12)', color: '#f59e0b'}}>
                <Target size={20} />
              </div>
              <span className="login-feature-text"><strong>Test Sistemi</strong> — Akıllı algoritmalarla kelime ustalaşma</span>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon" style={{background: 'rgba(20,184,166,0.12)', color: '#14b8a6'}}>
                <BookOpen size={20} />
              </div>
              <span className="login-feature-text"><strong>Kelime Havuzu</strong> — Kişiselleştirilmiş öğrenme sistemi</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className="login-right">
        <div className="login-card animate-fade-in" style={{animationDelay: '0.15s'}}>
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: '2rem'}}>
            <Image src="/logo.png" alt="Owlish Logo" width={64} height={64} style={{borderRadius: '1rem', boxShadow: '0 8px 25px rgba(99, 102, 241, 0.25)', objectFit: 'cover'}} />
          </div>

          <h2>{isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}</h2>
          <p className="subtitle">
            {isLogin ? 'Hesabınıza giriş yaparak devam edin.' : 'Ücretsiz hesabınızı oluşturun ve öğrenmeye başlayın.'}
          </p>

          {error && (
            <div className="alert error-alert">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {message && (
            <div className="alert success-alert">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {!isLogin && (
              <div className="input-group">
                <User className="input-icon" size={18} />
                <input
                  type="text"
                  placeholder="Kullanıcı Adı"
                  className="input-field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="input-group">
              <Mail className="input-icon" size={18} />
              <input
                type="text"
                placeholder="E-posta adresi"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                placeholder="Şifre"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {!isLogin && (
              <div className="input-group">
                <Lock className="input-icon" size={18} />
                <input
                  type="password"
                  placeholder="Şifreyi Onayla"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}

            {isLogin && (
              <div className="forgot-password">
                <button type="button" onClick={() => { setShowResetModal(true); setError(''); setMessage(''); }}>Şifremi unuttum</button>
              </div>
            )}

            <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
              {loading ? <div className="spinner-small"></div> : (
                <>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'} <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div className="switch-mode">
            <button type="button" onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setMessage('');
            }}>
              {isLogin ? <>Hesabınız yok mu? <span>Kayıt olun</span></> : <>Zaten hesabınız var mı? <span>Giriş yapın</span></>}
            </button>
          </div>
        </div>
      </div>

      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <h2>Şifre Sıfırlama</h2>
            <p>Hesabınıza kayıtlı e-posta adresini girin, size bir sıfırlama bağlantısı gönderelim.</p>
            <form onSubmit={handleForgotPassword} style={{marginTop: '1.5rem'}}>
              <div className="input-group">
                <Mail className="input-icon" size={18} />
                <input
                  type="text"
                  placeholder="E-posta Adresiniz"
                  className="input-field"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions" style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
                <button type="button" className="btn btn-outline" style={{flex: 1}} onClick={() => setShowResetModal(false)}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary" style={{flex: 1}} disabled={loading}>
                  {loading ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
