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
        className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left transition-colors"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
      >
        <Pin className="h-3.5 w-3.5" style={{ color: 'var(--warning)' }} strokeWidth={1.6} />
        <span className="flex-1 text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          고정된 메시지 ({pinnedMessages.length})
        </span>
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.6} />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.6} />
        )}
      </button>

      {!collapsed && (
        <div className="mt-1 space-y-1">
          {pinnedMessages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => onScrollTo(msg.id)}
              className="flex w-full items-start gap-2 rounded-[6px] px-3 py-2 text-left transition-colors"
              style={{
                border: '1px solid var(--border)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Pin
                className="mt-0.5 h-3 w-3 flex-shrink-0"
                style={{ color: 'var(--warning)' }}
                strokeWidth={1.6}
              />
              <p
                className="line-clamp-2 flex-1 text-[12px] leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
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
