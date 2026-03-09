'use client';

import { useState } from 'react';
import { Pin, ChevronDown, ChevronRight } from 'lucide-react';
import { PinnedMessageResponse } from '@/lib/types';

interface PinnedMessagesProps {
  pinnedMessages: PinnedMessageResponse[];
  onScrollTo: (messageId: string) => void;
}

export default function PinnedMessages({ pinnedMessages, onScrollTo }: PinnedMessagesProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (pinnedMessages.length === 0) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-left transition-colors hover:bg-amber-100/80"
      >
        <Pin className="h-3.5 w-3.5 text-amber-600" />
        <span className="flex-1 text-[12px] font-medium text-amber-700">
          고정된 메시지 ({pinnedMessages.length})
        </span>
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-amber-500" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-amber-500" />
        )}
      </button>

      {!collapsed && (
        <div className="mt-1 space-y-1">
          {pinnedMessages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => onScrollTo(msg.id)}
              className="flex w-full items-start gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-left transition-colors hover:bg-slate-50"
            >
              <Pin className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-500" />
              <p className="line-clamp-2 flex-1 text-[12px] leading-relaxed text-slate-600">
                {msg.content.length > 100
                  ? msg.content.slice(0, 100) + '...'
                  : msg.content}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
