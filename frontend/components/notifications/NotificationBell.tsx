'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';
import NotificationDropdown from './NotificationDropdown';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const { startPolling, stopPolling, fetchUnreadCount } = useNotificationStore();

  useEffect(() => {
    fetchUnreadCount();
    startPolling();
    return () => stopPolling();
  }, [fetchUnreadCount, startPolling, stopPolling]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          borderRadius: '6px',
          padding: '6px',
          color: 'var(--text-secondary)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Bell className="h-5 w-5" strokeWidth={2} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              minWidth: '14px',
              height: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '9999px',
              background: 'var(--error)',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              lineHeight: 1,
              padding: '0 3px',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && <NotificationDropdown onClose={() => setOpen(false)} />}
    </div>
  );
}
