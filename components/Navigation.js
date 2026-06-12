'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { LogOut, Home, BookOpen, Layers, Target, Newspaper, Video, Languages, Award, User, Crown, Bot, Sparkles } from 'lucide-react';
import './Navigation.css';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Kelime Havuzum', path: '/my-pool', icon: Layers },
  { name: 'Çeviri & Kamera', path: '/translation', icon: Languages },
  { name: 'Kendini Test Et', path: '/test', icon: Target },
  { name: 'Öğrendiklerim', path: '/learned', icon: Award },
  { name: 'Kelime Paketleri', path: '/words', icon: BookOpen },
  { name: 'Yapay Zeka Sohbet', path: '/ai-chat', icon: Bot },
  { name: 'Yapay Zeka Hikaye', path: '/story', icon: Sparkles },
  { name: 'Video Pratik', path: '/video', icon: Video },
  { name: 'Haberler', path: '/news', icon: Newspaper },
  { name: 'Premium\'a Geç', path: '/pricing', icon: Crown },
  { name: 'Profilim', path: '/profile', icon: User }
];

export default function Navigation() {
  const pathname = usePathname();
  const { logout, isPro, user } = useAuth();

  // Don't show navigation on splash or login screens
  if (pathname === '/' || pathname === '/login') {
    return null;
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start'}}>
          <Link href={user ? "/dashboard" : "/"} style={{textDecoration: 'none'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: isPro ? '0.5rem' : '0'}}>
              <Image src="/logo.png" alt="Owlish Logo" width={32} height={32} style={{borderRadius: '8px', objectFit: 'cover'}} />
              <span className="logo-text">Owlish</span>
            </div>
          </Link>
          {isPro && (
            <div style={{background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 10px rgba(251, 191, 36, 0.3)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
              <Crown size={14} /> Premium Aktif
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-links">
        {navItems.map((item) => {
          if (item.path === '/pricing' && isPro) return null;
          
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="footer-actions">
          <ThemeToggle />
          <button className="nav-link logout-btn" onClick={logout}>
            <LogOut className="nav-icon" size={20} />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
