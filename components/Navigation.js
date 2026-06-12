'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { LogOut, Home, BookOpen, Layers, Target, Newspaper, Video, Languages, Award, User, Crown, Bot, Sparkles, Menu, X } from 'lucide-react';
import './Navigation.css';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home, mobileBar: true },
  { name: 'Kelime Havuzum', path: '/my-pool', icon: Layers, mobileBar: true },
  { name: 'Çeviri & Kamera', path: '/translation', icon: Languages },
  { name: 'Kendini Test Et', path: '/test', icon: Target, mobileBar: true },
  { name: 'Öğrendiklerim', path: '/learned', icon: Award },
  { name: 'Kelime Paketleri', path: '/words', icon: BookOpen },
  { name: 'Yapay Zeka Sohbet', path: '/ai-chat', icon: Bot, mobileBar: true },
  { name: 'Yapay Zeka Hikaye', path: '/story', icon: Sparkles },
  { name: 'Video Pratik', path: '/video', icon: Video },
  { name: 'Haberler', path: '/news', icon: Newspaper },
  { name: "Premium'a Geç", path: '/pricing', icon: Crown },
  { name: 'Profilim', path: '/profile', icon: User }
];

export default function Navigation() {
  const pathname = usePathname();
  const { logout, isPro, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (pathname === '/' || pathname === '/login') {
    return null;
  }

  const mobileBarItems = navItems.filter(item => item.mobileBar);

  return (
    <>
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

        {/* Desktop: all items */}
        <div className="sidebar-links desktop-links">
          {navItems.map((item) => {
            if (item.path === '/pricing' && isPro) return null;
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path} className={`nav-link ${isActive ? 'active' : ''}`}>
                <Icon className="nav-icon" size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile: only 5 items + menu button */}
        <div className="sidebar-links mobile-links">
          {mobileBarItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path} className={`nav-link ${isActive ? 'active' : ''}`}>
                <Icon className="nav-icon" size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <button className={`nav-link ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(true)}>
            <Menu className="nav-icon" size={20} />
            <span>Menü</span>
          </button>
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

      {/* Mobile Full Menu Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h3>Menü</h3>
              <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="mobile-menu-items">
              {navItems.map((item) => {
                if (item.path === '/pricing' && isPro) return null;
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`mobile-menu-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mobile-menu-footer">
              <ThemeToggle />
              <button className="mobile-menu-link logout" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                <LogOut size={20} />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
