'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: '기능', href: '#features' },
];

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    if (href.startsWith('#')) {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
      }}
    >
      <div className="mx-auto max-w-[1100px] px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-[17px] font-bold tracking-heading" style={{ color: 'var(--text-primary)' }}>
          IntelliDocs
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-[14px] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/auth/login"
            className="text-[14px] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            로그인
          </Link>
          <Link
            href="/auth/register"
            className="rounded-button px-4 py-[7px] text-[14px] font-medium text-white transition-colors"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            시작하기
          </Link>
        </div>

        {/* Mobile */}
        <button
          className="md:hidden"
          style={{ color: 'var(--text-primary)' }}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden px-6 py-5 space-y-3"
          style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="block text-[14px] py-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/auth/login"
            className="block text-[14px] py-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            로그인
          </Link>
          <Link
            href="/auth/register"
            className="block w-full text-center rounded-button px-4 py-2.5 text-[14px] font-medium text-white mt-3"
            style={{ background: 'var(--accent)' }}
          >
            시작하기
          </Link>
        </div>
      )}
    </nav>
  );
}
