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
    <div className="flex-shrink-0 border-t border-slate-200/80 bg-white p-4 shadow-[0_-1px_3px_rgba(0,0,0,0.03)]">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 transition-colors focus-within:border-primary-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-100">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="문서에 대해 질문하세요..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-[13px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
          />
          {streaming ? (
            <button
              onClick={stopStreaming}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-500 text-white transition-colors hover:bg-red-600"
            >
              <Square className="h-3 w-3" fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white transition-all hover:bg-primary-700 disabled:opacity-30"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1">
          <p className="text-[11px] text-slate-400">
            Shift+Enter 줄바꿈 · Enter 전송
          </p>
          {selectedDocIds.length > 0 && (
            <p className="text-[11px] text-primary-500">
              {selectedDocIds.length}개 문서 선택됨
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
