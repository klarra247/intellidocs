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
          className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
            isPinned
              ? 'border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100'
              : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600'
          }`}
          title={isPinned ? '고정 해제' : '고정'}
        >
          {isPinned ? (
            <PinOff className="h-3 w-3" />
          ) : (
            <Pin className="h-3 w-3" />
          )}
        </button>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onComment(); }}
        className="relative flex h-6 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 text-slate-400 transition-colors hover:text-slate-600"
        title="코멘트"
      >
        <MessageSquare className="h-3 w-3" />
        {(message.commentCount ?? 0) > 0 && (
          <span className="text-[10px] font-medium text-primary-600">
            {message.commentCount}
          </span>
        )}
      </button>
    </div>
  );
}
