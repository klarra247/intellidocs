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
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">알림</h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-slate-500">미읽음 {unreadCount}개</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            모두 읽음
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 mb-4">
        {FILTER_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setFilter(key); setPage(0); }}
            className={`rounded-full px-3 py-1 text-[13px] font-medium transition-colors ${
              filter === key
                ? 'bg-primary-50 text-primary-700 border border-primary-200'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Bell className="h-12 w-12 mb-3 text-slate-300" />
            <p className="text-sm font-medium">새로운 알림이 없습니다</p>
            <p className="mt-1 text-[13px]">활동이 생기면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((n) => (
              <NotificationItem key={n.id} notification={n} variant="full" />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-slate-600">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
