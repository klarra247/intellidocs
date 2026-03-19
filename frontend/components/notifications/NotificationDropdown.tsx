'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, Bell } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';
import NotificationItem from './NotificationItem';

interface Props {
  onClose: () => void;
}

export default function NotificationDropdown({ onClose }: Props) {
  const router = useRouter();
  const { notifications, loading, unreadCount, fetchNotifications, markAllAsRead } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(0, 10);
  }, [fetchNotifications]);

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllAsRead();
  };

  const handleViewAll = () => {
    onClose();
    router.push('/workspace/notifications');
  };

  return (
    <div
      className="absolute right-0 top-full z-50 mt-1 w-96 animate-scale-in"
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          padding: '12px 16px',
        }}
      >
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>알림</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--accent)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            모두 읽음
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {loading && notifications.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '9999px',
                border: '2px solid var(--border)',
                borderTopColor: 'var(--accent)',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          </div>
        ) : notifications.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 0',
              color: 'var(--text-tertiary)',
            }}
          >
            <Bell style={{ width: '32px', height: '32px', marginBottom: '8px', color: 'var(--text-tertiary)' }} />
            <p style={{ fontSize: '13px', margin: 0 }}>새로운 알림이 없습니다</p>
          </div>
        ) : (
          <div style={{ borderTop: 'none' }}>
            {notifications.slice(0, 10).map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                variant="compact"
                onNavigate={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleViewAll}
            style={{
              width: '100%',
              padding: '10px 0',
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--accent)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '0 0 8px 8px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            모든 알림 보기
          </button>
        </div>
      )}
    </div>
  );
}
