'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Loader2, BarChart3, AlertTriangle, RefreshCw, FileBarChart } from 'lucide-react';
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
  const setPrefillInput = useChatStore((s) => s.setPrefillInput);
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
      <div className="flex flex-1 items-center justify-center animate-fade-in">
        <div className="w-full max-w-md px-6">
          <p className="text-center text-[15px] font-medium mb-5" style={{ color: 'var(--text-primary)' }}>
            무엇이든 물어보세요
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: BarChart3, category: '표로 정리', example: '매출 추이를 표로 보여줘' },
              { icon: AlertTriangle, category: '수치 비교', example: '문서 간 차이 확인해줘' },
              { icon: RefreshCw, category: '버전 비교', example: '전 분기 대비 변경 사항' },
              { icon: FileBarChart, category: '리포트 생성', example: '분석 리포트 만들어줘' },
            ].map((s) => (
              <button
                key={s.category}
                onClick={() => setPrefillInput(s.example)}
                className="flex flex-col gap-2 rounded-[8px] p-4 text-left transition-colors"
                style={{ background: 'var(--bg-secondary)', border: '1px solid transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <s.icon className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} strokeWidth={1.8} />
                <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{s.category}</p>
                <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>&ldquo;{s.example}&rdquo;</p>
              </button>
            ))}
          </div>
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
