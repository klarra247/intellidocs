'use client';

import { Share2 } from 'lucide-react';
import { SessionSummary } from '@/lib/types';
import SessionContextMenu from './SessionContextMenu';

interface SessionItemProps {
  session: SessionSummary;
  isActive: boolean;
  onClick: () => void;
  onShare: () => void;
  onUnshare: () => void;
}

export default function SessionItem({ session, isActive, onClick, onShare, onUnshare }: SessionItemProps) {
  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer items-center gap-2 rounded-[6px] px-3 py-2.5 transition-colors"
      style={{
        background: isActive ? 'var(--bg-active)' : 'transparent',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {session.isShared && (
            <Share2
              className="h-3 w-3 flex-shrink-0"
              strokeWidth={1.6}
              style={{ color: 'var(--text-tertiary)' }}
            />
          )}
          <p
            className="truncate text-[13px]"
            style={{ fontWeight: isActive ? 500 : 400 }}
          >
            {session.title || '새 채팅'}
          </p>
        </div>
        {!session.isOwner && session.creatorName && (
          <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            {session.creatorName}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {session.unreadCount > 0 && (
          <span
            className="inline-flex h-[6px] w-[6px] flex-shrink-0 rounded-full"
            style={{ background: 'var(--accent)' }}
            title={`${session.unreadCount}개 읽지 않음`}
          />
        )}
        <SessionContextMenu
          session={session}
          onShare={onShare}
          onUnshare={onUnshare}
        />
      </div>
    </div>
  );
}
