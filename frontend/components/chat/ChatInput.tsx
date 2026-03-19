'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';

export default function ChatInput() {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, stopStreaming, streaming, selectedDocIds } =
    useChatStore();

  const handleSubmit = () => {
    const query = input.trim();
    if (!query || streaming) return;
    setInput('');
    sendMessage(query);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Skip during Korean/CJK IME composition to prevent partial character submission
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  };

  return (
    <div
      className="flex-shrink-0 p-4"
      style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border)' }}
    >
      <div className="mx-auto max-w-3xl">
        <div
          className="flex items-center gap-2 rounded-[8px] px-3 py-2 transition-colors"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-primary)' }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="문서에 대해 질문하세요..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-[13px] leading-relaxed outline-none"
            style={{
              color: 'var(--text-primary)',
            }}
          />
          {streaming ? (
            <button
              onClick={stopStreaming}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] text-white transition-colors"
              style={{ background: 'var(--error)' }}
            >
              <Square className="h-3 w-3" fill="currentColor" strokeWidth={0} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] text-white transition-colors disabled:opacity-30"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--accent-hover)';
              }}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
            >
              <Send className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1">
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            Shift+Enter 줄바꿈 · Enter 전송
          </p>
          {selectedDocIds.length > 0 && (
            <p className="text-[11px]" style={{ color: 'var(--accent)' }}>
              {selectedDocIds.length}개 문서 선택됨
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
