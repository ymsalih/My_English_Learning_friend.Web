'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';
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

  const { login, register, resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
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
      <div className="bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
      </div>
      
      <div className="login-card glass-panel animate-fade-in">
        <div className="logo-hero">
          <span className="logo-hero-text">İD</span>
        </div>
        
        <h2>{isLogin ? 'Hoş Geldin! 👋' : 'Aramıza Katıl 💕'}</h2>
        <p className="subtitle">
          {isLogin ? 'Kelimelerin dünyasına tekrar hoş geldin.' : 'İngilizce öğrenme serüvenine başla.'}
        </p>

        {error && (
          <div className="alert error-alert">
            <AlertCircle size={18} /> {error}
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
              <User className="input-icon" size={20} />
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
            <Mail className="input-icon" size={20} />
            <input 
              type="email" 
              placeholder="E-posta" 
              className="input-field" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <Lock className="input-icon" size={20} />
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
              <Lock className="input-icon" size={20} />
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
            {loading ? <div className="spinner-small"></div> : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
          </button>
        </form>

        <div className="switch-mode">
          <button type="button" onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setMessage('');
          }}>
            {isLogin ? 'Yeni kayıt oluştur' : 'Zaten hesabım var, Giriş yap'}
          </button>
        </div>
      </div>

      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <h2>Şifre Sıfırlama</h2>
            <p>Hesabınıza kayıtlı e-posta adresini girin, size bir sıfırlama bağlantısı gönderelim.</p>
            <form onSubmit={handleForgotPassword} style={{marginTop: '1.5rem'}}>
              <div className="input-group">
                <Mail className="input-icon" size={20} />
                <input 
                  type="email" 
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
