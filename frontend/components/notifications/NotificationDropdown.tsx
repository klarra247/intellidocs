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
    <div className="absolute right-0 top-full z-50 mt-1 w-96 rounded-xl border border-slate-200 bg-white shadow-xl animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-800">알림</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-[12px] font-medium text-primary-600 hover:text-primary-700"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            모두 읽음
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Bell className="h-8 w-8 mb-2 text-slate-300" />
            <p className="text-sm">새로운 알림이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
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
        <div className="border-t border-slate-100">
          <button
            onClick={handleViewAll}
            className="w-full py-2.5 text-center text-[13px] font-medium text-primary-600 hover:bg-slate-50 transition-colors rounded-b-xl"
          >
            모든 알림 보기
          </button>
        </div>
      )}
    </div>
  );
}
