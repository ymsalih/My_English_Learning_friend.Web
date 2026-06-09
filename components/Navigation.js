'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { LogOut, Home, BookOpen, Layers, Target, Newspaper, Video, Languages, Award, User } from 'lucide-react';
import './Navigation.css';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Home },
  { name: 'Kelime Havuzum', path: '/my-pool', icon: Layers },
  { name: 'Çeviri & Kamera', path: '/translation', icon: Languages },
  { name: 'Kendini Test Et', path: '/test', icon: Target },
  { name: 'Öğrendiklerim', path: '/learned', icon: Award },
  { name: 'Kelime Paketleri', path: '/words', icon: BookOpen },
  { name: 'Video Pratik', path: '/video', icon: Video },
  { name: 'Haberler', path: '/news', icon: Newspaper },
  { name: 'Profilim', path: '/profile', icon: User }
];

export default function Navigation() {
  const pathname = usePathname();
  const { logout } = useAuth();

  // Don't show navigation on splash or login screens
  if (pathname === '/' || pathname === '/login') {
    return null;
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          {/* Logo will be an image or styled text */}
          <span className="logo-text">İngilizce Destek</span>
        </div>
      </div>

      <div className="sidebar-links">
        {navItems.map((item) => {
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
