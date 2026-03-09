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
      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition-colors ${
        isActive
          ? 'bg-primary-50 text-primary-700'
          : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {session.isShared && (
            <Share2 className="h-3 w-3 flex-shrink-0 text-primary-500" />
          )}
          <p className="truncate text-[13px] font-medium">
            {session.title || '새 채팅'}
          </p>
        </div>
        {!session.isOwner && session.creatorName && (
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            {session.creatorName}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {session.unreadCount > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-semibold text-white">
            {session.unreadCount > 99 ? '99+' : session.unreadCount}
          </span>
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
