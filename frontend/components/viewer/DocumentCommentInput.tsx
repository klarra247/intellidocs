'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, X, MapPin } from 'lucide-react';
import { useDocumentCommentStore } from '@/stores/documentCommentStore';

export default function DocumentCommentInput() {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createComment = useDocumentCommentStore((s) => s.createComment);
  const totalCount = useDocumentCommentStore((s) => s.totalCount);
  const pendingLocation = useDocumentCommentStore((s) => s.pendingLocation);
  const clearPendingLocation = useDocumentCommentStore((s) => s.clearPendingLocation);

  const handleSubmit = () => {
    const content = input.trim();
    if (!content) return;

    if (totalCount >= 100) {
      try {
        const { useChatStore } = require('@/stores/chatStore');
        useChatStore.getState().showToast('문서당 최대 100개의 코멘트만 작성할 수 있습니다', 'error');
      } catch { /* */ }
      return;
    }

    createComment(content, pendingLocation?.chunkIndex, pendingLocation?.pageNumber);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-slate-200 p-3">
      {/* Pending location chip */}
      {pendingLocation && (
        <div className="mb-2 flex items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
            <MapPin className="h-3 w-3" />
            {pendingLocation.pageNumber != null && `p.${pendingLocation.pageNumber}`}
            {pendingLocation.pageNumber != null && pendingLocation.chunkIndex != null && ' / '}
            {pendingLocation.chunkIndex != null && `청크 ${pendingLocation.chunkIndex}`}
          </span>
          <button
            onClick={clearPendingLocation}
            className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 2000))}
          onKeyDown={handleKeyDown}
          placeholder="코멘트 작성..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100"
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white transition-all hover:bg-primary-700 disabled:opacity-30"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 px-1 text-[11px] text-slate-400">
        Shift+Enter 줄바꿈 · Enter 전송 · 최대 2000자
      </p>
    </div>
  );
}
