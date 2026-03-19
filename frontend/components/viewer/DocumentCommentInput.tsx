'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, X, MapPin } from 'lucide-react';
import { useDocumentCommentStore } from '@/stores/documentCommentStore';

export default function DocumentCommentInput() {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [clearBtnHover, setClearBtnHover] = useState(false);
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
    <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
      {/* Pending location chip */}
      {pendingLocation && (
        <div className="mb-2 flex items-center gap-1">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            <MapPin className="h-3 w-3" />
            {pendingLocation.pageNumber != null && `p.${pendingLocation.pageNumber}`}
            {pendingLocation.pageNumber != null && pendingLocation.chunkIndex != null && ' / '}
            {pendingLocation.chunkIndex != null && `청크 ${pendingLocation.chunkIndex}`}
          </span>
          <button
            onClick={clearPendingLocation}
            className="flex h-4 w-4 items-center justify-center rounded-full"
            style={{
              color: clearBtnHover ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              backgroundColor: clearBtnHover ? 'var(--bg-active)' : 'transparent',
            }}
            onMouseEnter={() => setClearBtnHover(true)}
            onMouseLeave={() => setClearBtnHover(false)}
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="코멘트 작성..."
          rows={1}
          className="flex-1 resize-none rounded-[6px] px-3 py-2 text-[13px] leading-relaxed outline-none"
          style={{
            border: `1px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
            backgroundColor: focused ? 'var(--bg-primary)' : 'var(--bg-secondary)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] transition-all disabled:opacity-30"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'var(--accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent)'; }}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 px-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        Shift+Enter 줄바꿈 · Enter 전송 · 최대 2000자
      </p>
    </div>
  );
}
