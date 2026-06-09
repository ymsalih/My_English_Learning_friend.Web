'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import './ThemeToggle.css';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="theme-toggle" aria-label="Toggle Theme">
        <div className="icon-placeholder"></div>
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      className={`theme-toggle ${isDark ? 'dark' : 'light'}`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle Theme"
      title={isDark ? "Açık Moda Geç" : "Koyu Moda Geç"}
    >
      <div className="toggle-track">
        <div className="toggle-thumb">
          {isDark ? (
            <Moon size={14} className="icon moon" />
          ) : (
            <Sun size={14} className="icon sun" />
          )}
        </div>
      </div>
    </button>
  );
}
