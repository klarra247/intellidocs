'use client';

import { useRouter } from 'next/navigation';
import type { Notification } from '@/lib/types';
import { useNotificationStore } from '@/stores/notificationStore';
import { useViewerStore } from '@/stores/viewerStore';
import { useChatStore } from '@/stores/chatStore';
import NotificationTypeIcon from './NotificationTypeIcon';

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

interface Props {
  notification: Notification;
  variant?: 'compact' | 'full';
  onNavigate?: () => void;
}

export default function NotificationItem({ notification, variant = 'compact', onNavigate }: Props) {
  const router = useRouter();
  const markAsRead = useNotificationStore((s) => s.markAsRead);

  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    const { referenceType, referenceId } = notification;

    if (referenceType && referenceId) {
      switch (referenceType) {
        case 'chat_session':
          router.push('/workspace/chat');
          setTimeout(() => useChatStore.getState().selectSession(referenceId), 100);
          break;
        case 'chat_message':
          router.push('/workspace/chat');
          setTimeout(() => useChatStore.getState().openCommentPanel(referenceId), 100);
          break;
        case 'document':
          useViewerStore.getState().openViewer(referenceId);
          break;
        case 'discrepancy':
          router.push('/workspace');
          break;
        case 'workspace':
          router.push('/workspace/settings');
          break;
        default:
          break;
      }
    }

    onNavigate?.();
  };

  const isCompact = variant === 'compact';

  return (
    <button
      onClick={handleClick}
      className={`flex w-full items-start gap-3 text-left transition-colors ${
        isCompact ? 'px-3 py-2.5' : 'px-4 py-3'
      } ${
        notification.isRead
          ? 'bg-white hover:bg-slate-50'
          : 'bg-blue-50/50 hover:bg-blue-50'
      }`}
    >
      {/* Unread dot + type icon */}
      <div className="flex shrink-0 flex-col items-center pt-1">
        {!notification.isRead && (
          <div className="mb-1 h-2 w-2 rounded-full bg-blue-500" />
        )}
        <NotificationTypeIcon type={notification.type} size={isCompact ? 'sm' : 'md'} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={`font-medium text-slate-800 ${isCompact ? 'truncate text-[13px]' : 'text-sm'}`}>
          {notification.title}
        </p>
        {notification.message && (
          <p className={`mt-0.5 text-slate-500 ${isCompact ? 'truncate text-[12px]' : 'text-[13px] line-clamp-2'}`}>
            {notification.message}
          </p>
        )}
        <p className={`mt-1 text-slate-400 ${isCompact ? 'text-[11px]' : 'text-[12px]'}`}>
          {notification.senderName && (
            <span className="font-medium text-slate-500">{notification.senderName} · </span>
          )}
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}
