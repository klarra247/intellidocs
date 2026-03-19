'use client';

import { Plus, AlertCircle, PanelLeftClose, PanelLeftOpen, Share2 } from 'lucide-react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ReadOnlyBanner from './ReadOnlyBanner';
import Toast from '@/components/ui/Toast';
import { useChatStore } from '@/stores/chatStore';

interface ChatContainerProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function ChatContainer({ sidebarOpen, onToggleSidebar }: ChatContainerProps) {
  const { error, clearChat, streaming, messages, isShared, isOwner, creatorName } =
    useChatStore();

  const isReadOnly = isShared && !isOwner;

  return (
    <div className="flex h-full flex-col">
      {/* Header bar — always visible */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="flex h-7 w-7 items-center justify-center rounded-[4px] transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              title={sidebarOpen ? '패널 닫기' : '문서 선택'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" strokeWidth={1.6} />
              ) : (
                <PanelLeftOpen className="h-4 w-4" strokeWidth={1.6} />
              )}
            </button>
          )}
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
            AI 채팅
          </span>
          {isShared && (
            <span
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Share2 className="h-3 w-3" strokeWidth={1.6} />
              공유됨
            </span>
          )}
        </div>
        <button
          onClick={clearChat}
          disabled={streaming || messages.length === 0}
          className="inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-40"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.6} />
          새 채팅
        </button>
      </div>

      {/* Read-only banner for shared sessions */}
      {isReadOnly && <ReadOnlyBanner creatorName={creatorName} />}

      {/* Messages */}
      <MessageList />

      {/* Error banner */}
      {error && (
        <div
          className="mx-4 mb-2 flex items-center gap-2 rounded-[6px] px-4 py-2.5 text-[13px] animate-slide-up"
          style={{ background: '#fdf2f2', color: 'var(--error)' }}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" strokeWidth={1.6} />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Input — hidden for read-only shared sessions */}
      {!isReadOnly && <ChatInput />}

      {/* Toast notifications */}
      <Toast />
    </div>
  );
}
