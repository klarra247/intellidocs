'use client';

import { Pin, PinOff, MessageSquare } from 'lucide-react';
import { ChatMessage } from '@/lib/types';

interface MessageActionsProps {
  message: ChatMessage;
  isOwner: boolean;
  onPin: () => void;
  onComment: () => void;
}

export default function MessageActions({ message, isOwner, onPin, onComment }: MessageActionsProps) {
  if (message.role !== 'ASSISTANT') return null;

  const isPinned = message.isPinned;

  return (
    <div
      className={`flex items-center gap-1 ${
        isPinned ? 'opacity-100' : 'opacity-0 transition-opacity group-hover:opacity-100'
      }`}
    >
      {isOwner && (
        <button
          onClick={(e) => { e.stopPropagation(); onPin(); }}
          className="flex h-6 w-6 items-center justify-center rounded-[4px] transition-colors"
          style={{
            color: isPinned ? 'var(--warning)' : 'var(--text-tertiary)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title={isPinned ? '고정 해제' : '고정'}
        >
          {isPinned ? (
            <PinOff className="h-3 w-3" strokeWidth={1.6} />
          ) : (
            <Pin className="h-3 w-3" strokeWidth={1.6} />
          )}
        </button>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onComment(); }}
        className="relative flex h-6 items-center gap-1 rounded-[4px] px-1.5 transition-colors"
        style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        title="코멘트"
      >
        <MessageSquare className="h-3 w-3" strokeWidth={1.6} />
        {(message.commentCount ?? 0) > 0 && (
          <span className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>
            {message.commentCount}
          </span>
        )}
      </button>
    </div>
  );
}
