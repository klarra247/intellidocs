'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';
import NotificationItem from '@/components/notifications/NotificationItem';

type FilterType = 'all' | 'unread' | 'comment' | 'document' | 'review' | 'system';

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'unread', label: '미읽음' },
  { key: 'comment', label: '코멘트' },
  { key: 'document', label: '문서' },
  { key: 'review', label: '리뷰' },
  { key: 'system', label: '시스템' },
];

const TYPE_GROUPS: Record<string, string[]> = {
  comment: ['COMMENT_ADDED', 'DOC_COMMENT_ADDED'],
  document: ['DOCUMENT_INDEXED', 'VERSION_DIFF_COMPLETED', 'DISCREPANCY_FOUND'],
  review: ['REVIEW_REQUESTED', 'REVIEW_COMPLETED'],
  system: ['SESSION_SHARED', 'MESSAGE_PINNED', 'WORKSPACE_INVITATION'],
};

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { notifications, loading, totalCount, unreadCount, fetchNotifications, markAllAsRead } = useNotificationStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(0);

  const loadNotifications = useCallback(() => {
    const isRead = filter === 'unread' ? false : undefined;
    fetchNotifications(page, PAGE_SIZE, isRead);
  }, [filter, page, fetchNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Client-side type filter
  const filteredNotifications = filter === 'all' || filter === 'unread'
    ? notifications
    : notifications.filter((n) => TYPE_GROUPS[filter]?.includes(n.type));

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div style={{ maxWidth: '768px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>알림</h1>
          {unreadCount > 0 && (
            <p style={{ marginTop: '4px', fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              미읽음 {unreadCount}개
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              padding: '6px 12px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <CheckCheck className="h-4 w-4" />
            모두 읽음
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
        {FILTER_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setFilter(key); setPage(0); }}
            style={{
              borderRadius: '9999px',
              padding: '4px 12px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s',
              ...(filter === key
                ? {
                    background: 'var(--bg-active)',
                    color: 'var(--text-primary)',
                    border: 'none',
                  }
                : {
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }),
            }}
            onMouseEnter={(e) => {
              if (filter !== key) e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              if (filter !== key) e.currentTarget.style.background = 'transparent';
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div
        style={{
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: 'var(--bg-primary)',
          overflow: 'hidden',
        }}
      >
        {loading && notifications.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                border: '2px solid var(--border)',
                borderTopColor: 'var(--accent)',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px 0',
              color: 'var(--text-tertiary)',
            }}
          >
            <Bell style={{ width: '48px', height: '48px', marginBottom: '12px', color: 'var(--text-tertiary)' }} />
            <p style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 4px 0', color: 'var(--text-tertiary)' }}>
              새로운 알림이 없습니다
            </p>
            <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-tertiary)' }}>
              활동이 생기면 여기에 표시됩니다
            </p>
          </div>
        ) : (
          <div>
            {filteredNotifications.map((n) => (
              <NotificationItem key={n.id} notification={n} variant="full" />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              borderRadius: '6px',
              border: '1px solid var(--border)',
              padding: '6px',
              color: 'var(--text-secondary)',
              background: 'transparent',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              opacity: page === 0 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (page !== 0) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{
              borderRadius: '6px',
              border: '1px solid var(--border)',
              padding: '6px',
              color: 'var(--text-secondary)',
              background: 'transparent',
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages - 1 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (page < totalPages - 1) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
