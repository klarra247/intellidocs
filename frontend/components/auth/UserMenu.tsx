'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

export default function UserMenu() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [triggerHover, setTriggerHover] = useState(false);
  const [logoutHover, setLogoutHover] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push('/auth/login');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-[13px] transition-colors"
        style={{ backgroundColor: triggerHover ? 'var(--bg-hover)' : 'transparent' }}
        onMouseEnter={() => setTriggerHover(true)}
        onMouseLeave={() => setTriggerHover(false)}
      >
        {user.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt={user.name}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            {initials}
          </div>
        )}
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-tertiary)' }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-[6px] py-1 animate-scale-in"
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
            <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors"
            style={{
              color: logoutHover ? 'var(--text-primary)' : 'var(--text-secondary)',
              backgroundColor: logoutHover ? 'var(--bg-hover)' : 'transparent',
            }}
            onMouseEnter={() => setLogoutHover(true)}
            onMouseLeave={() => setLogoutHover(false)}
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
