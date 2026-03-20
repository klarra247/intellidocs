'use client';

import { useRouter } from 'next/navigation';
import type { Notification } from '@/lib/types';
import { useNotificationStore } from '@/stores/notificationStore';
import { useViewerStore } from '@/stores/viewerStore';
import { useChatStore } from '@/stores/chatStore';
import { useDiscrepancyStore } from '@/stores/discrepancyStore';
import { discrepancyApi } from '@/lib/api';
import NotificationTypeIcon from './NotificationTypeIcon';

function parseUTCDate(dateStr: string): number {
  // Backend sends LocalDateTime without timezone suffix (e.g. "2026-03-21T10:30:00")
  // Append 'Z' to treat as UTC if no timezone info present
  if (!/[Z+\-]\d{0,2}:?\d{0,2}$/.test(dateStr)) {
    return new Date(dateStr + 'Z').getTime();
  }
  return new Date(dateStr).getTime();
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = parseUTCDate(dateStr);
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return new Date(parseUTCDate(dateStr)).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
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
          discrepancyApi.getResult(referenceId).then((result) => {
            useDiscrepancyStore.getState().openDetail(result);
          }).catch(() => {});
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
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        alignItems: 'flex-start',
        gap: '12px',
        textAlign: 'left',
        padding: isCompact ? '10px 12px' : '12px 16px',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Unread indicator bar */}
      {!notification.isRead && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            background: 'var(--accent)',
            borderRadius: '0 4px 4px 0',
          }}
        />
      )}

      {/* Type icon */}
      <div style={{ flexShrink: 0, paddingTop: '2px' }}>
        <NotificationTypeIcon type={notification.type} size={isCompact ? 'sm' : 'md'} />
      </div>

      {/* Content */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            fontWeight: 500,
            color: 'var(--text-primary)',
            fontSize: isCompact ? '13px' : '14px',
            margin: 0,
            overflow: isCompact ? 'hidden' : undefined,
            textOverflow: isCompact ? 'ellipsis' : undefined,
            whiteSpace: isCompact ? 'nowrap' : undefined,
          }}
        >
          {notification.title}
        </p>
        {notification.message && (
          <p
            style={{
              marginTop: '2px',
              color: 'var(--text-secondary)',
              fontSize: isCompact ? '12px' : '13px',
              margin: '2px 0 0 0',
              overflow: isCompact ? 'hidden' : undefined,
              textOverflow: isCompact ? 'ellipsis' : undefined,
              whiteSpace: isCompact ? 'nowrap' : undefined,
              display: !isCompact ? '-webkit-box' : undefined,
              WebkitLineClamp: !isCompact ? 2 : undefined,
              WebkitBoxOrient: !isCompact ? 'vertical' : undefined,
            }}
          >
            {notification.message}
          </p>
        )}
        <p
          style={{
            marginTop: '4px',
            color: 'var(--text-tertiary)',
            fontSize: isCompact ? '11px' : '12px',
            margin: '4px 0 0 0',
          }}
        >
          {notification.senderName && (
            <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{notification.senderName} · </span>
          )}
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}
