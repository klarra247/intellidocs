'use client';

import { useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import MessageBubble from './MessageBubble';
import ToolIndicator from './ToolIndicator';
import PinnedMessages from './PinnedMessages';

export default function MessageList() {
  const {
    messages,
    streaming,
    streamingContent,
    streamingSources,
    streamingConfidence,
    activeTools,
    pinnedMessages,
    isOwner,
    isShared,
    pinMessage,
    unpinMessage,
    openCommentPanel,
  } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, activeTools]);

  const scrollToMessage = useCallback((messageId: string) => {
    const el = scrollRef.current;
    if (!el) return;
    const target = el.querySelector(`[data-message-id="${messageId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('animate-highlight-pulse');
      setTimeout(() => target.classList.remove('animate-highlight-pulse'), 1500);
    }
  }, []);

  const isReadOnly = isShared && !isOwner;

  if (messages.length === 0 && !streaming) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center animate-fade-in">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[8px]"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <MessageSquare className="h-6 w-6" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            문서에 대해 질문하세요
          </p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            업로드된 문서를 기반으로 AI가 답변합니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
    >
      {/* Pinned messages section */}
      <PinnedMessages
        pinnedMessages={pinnedMessages}
        onScrollTo={scrollToMessage}
      />

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSessionOwner={isOwner}
            isReadOnly={isReadOnly}
            onPin={() =>
              msg.isPinned ? unpinMessage(msg.id) : pinMessage(msg.id)
            }
            onComment={() => openCommentPanel(msg.id)}
          />
        ))}

        {/* Loading indicator — before any content or tools arrive */}
        {streaming && !streamingContent && activeTools.length === 0 && (
          <div className="flex justify-start animate-slide-up">
            <div
              className="inline-flex items-center gap-2 rounded-[8px] px-4 py-3"
              style={{ border: '1px solid var(--border)' }}
            >
              <Loader2
                className="h-4 w-4 animate-spin"
                style={{ color: 'var(--accent)' }}
                strokeWidth={1.6}
              />
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                AI가 생각 중...
              </span>
            </div>
          </div>
        )}

        {streaming && activeTools.length > 0 && (
          <div className="flex justify-start">
            <ToolIndicator tools={activeTools} />
          </div>
        )}

        {streaming && streamingContent && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'ASSISTANT',
              content: streamingContent,
              sources: streamingSources,
              confidence: streamingConfidence ?? undefined,
              createdAt: new Date().toISOString(),
            }}
            isStreaming
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
