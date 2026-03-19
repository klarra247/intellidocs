'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: '기능', href: '#features' },
  // { label: '기술 스택', href: '#tech-stack' },
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-white/[0.06]'
          : ''
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-extrabold text-white tracking-tight"
        >
          Intelli<span className="text-emerald-400">Docs</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-[13px] text-slate-400 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/auth/login"
            className="text-[13px] text-slate-300 hover:text-white transition-colors"
          >
            로그인
          </Link>
          <Link
            href="/auth/register"
            className="rounded-full bg-emerald-500 px-5 py-2 text-[13px] font-semibold text-white hover:bg-emerald-400 transition-colors"
          >
            시작하기
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0a0f1e]/95 backdrop-blur-xl border-t border-white/[0.06] px-6 py-6 space-y-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="block text-slate-300 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/auth/login"
            className="block text-slate-300 hover:text-white transition-colors"
          >
            로그인
          </Link>
          <Link
            href="/auth/register"
            className="block w-full text-center rounded-full bg-emerald-500 px-5 py-2.5 text-[13px] font-semibold text-white mt-4"
          >
            시작하기
          </Link>
        </div>
      )}
    </nav>
  );
}
