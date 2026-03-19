'use client';

import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Paperclip } from 'lucide-react';
import { ChatMessage } from '@/lib/types';
import SourceBadgeGroup from './SourceBadgeGroup';
import TableRenderer from './TableRenderer';
import MessageActions from './MessageActions';
import type { Components } from 'react-markdown';

const markdownComponents: Components = {
  table: ({ children, ...props }) => (
    <TableRenderer {...props}>{children}</TableRenderer>
  ),
  p: ({ children }) => <div className="mb-2 last:mb-0">{children}</div>,
};

function getConfidenceDot(confidence: number): { color: string; label: string } {
  if (confidence >= 0.8) return { color: 'var(--success)', label: '높은 신뢰도' };
  if (confidence >= 0.5) return { color: 'var(--warning)', label: '보통 신뢰도' };
  if (confidence >= 0.2) return { color: 'var(--error)', label: '낮은 신뢰도' };
  return { color: 'var(--error)', label: '매우 낮은 신뢰도' };
}

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  isSessionOwner?: boolean;
  isReadOnly?: boolean;
  onPin?: () => void;
  onComment?: () => void;
}

function MessageBubbleInner({ message, isStreaming, isSessionOwner = true, onPin, onComment }: MessageBubbleProps) {
  const isUser = message.role === 'USER';
  const [copied, setCopied] = useState(false);
  const [docsExpanded, setDocsExpanded] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confidenceDot = !isUser && message.confidence != null
    ? getConfidenceDot(message.confidence)
    : null;

  const isPinned = message.isPinned;

  return (
    <div
      data-message-id={message.id}
      className={`group flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}
    >
      <div
        className="relative max-w-[85%] px-4 py-3"
        style={
          isUser
            ? {
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-sm)',
              }
            : {
                borderRadius: '16px',
                color: 'var(--text-primary)',
                borderLeft: isPinned ? '2px solid var(--warning)' : 'none',
                paddingLeft: isPinned ? '14px' : '16px',
              }
        }
      >
        {/* Copy button — AI messages only, on hover */}
        {!isUser && !isStreaming && message.content && (
          <button
            onClick={handleCopy}
            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-[4px] opacity-0 transition-opacity group-hover:opacity-100"
            style={{
              color: copied ? 'var(--success)' : 'var(--text-tertiary)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-primary)')}
            title="복사"
          >
            {copied ? (
              <Check className="h-3 w-3" strokeWidth={1.8} />
            ) : (
              <Copy className="h-3 w-3" strokeWidth={1.8} />
            )}
          </button>
        )}

        {/* Selected documents tag — USER messages only */}
        {isUser && message.selectedDocuments && message.selectedDocuments.length > 0 && (
          <div className="mb-1.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            <button
              type="button"
              onClick={() => setDocsExpanded((v) => !v)}
              className="flex items-center gap-1 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
            >
              <Paperclip className="h-3 w-3 flex-shrink-0" strokeWidth={1.6} />
              <span className="truncate">
                {message.selectedDocuments[0].filename}
                {message.selectedDocuments.length > 1 && ` 외 ${message.selectedDocuments.length - 1}개`}
              </span>
            </button>
            {docsExpanded && message.selectedDocuments.length > 1 && (
              <ul className="mt-1 ml-4 space-y-0.5">
                {message.selectedDocuments.map((d) => (
                  <li key={d.id} className="truncate">{d.filename}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isUser ? (
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
            {message.content}
          </p>
        ) : (
          <div className="prose-chat text-[13px] leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span
                className="ml-0.5 inline-block h-[18px] w-[2px] animate-pulse rounded-full"
                style={{ background: 'var(--accent)' }}
              />
            )}
          </div>
        )}

        {/* Confidence indicator — dot + text */}
        {confidenceDot && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            <span
              className="inline-block h-[6px] w-[6px] rounded-full flex-shrink-0"
              style={{ background: confidenceDot.color }}
            />
            {confidenceDot.label}
          </div>
        )}

        {/* Source badges */}
        {message.sources.length > 0 && (
          <div
            className="mt-2.5 flex flex-wrap gap-1.5 pt-2.5"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <SourceBadgeGroup sources={message.sources} />
          </div>
        )}

        {/* Message actions (pin, comment) — AI messages only */}
        {!isUser && !isStreaming && onPin && onComment && (
          <div className="absolute -right-1 top-8 translate-x-full">
            <MessageActions
              message={message}
              isOwner={isSessionOwner}
              onPin={onPin}
              onComment={onComment}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const MessageBubble = memo(MessageBubbleInner, (prev, next) => {
  if (prev.isStreaming || next.isStreaming) return false;
  return prev.message.id === next.message.id
    && prev.message.isPinned === next.message.isPinned
    && prev.message.commentCount === next.message.commentCount
    && (prev.message.selectedDocuments?.length ?? 0) === (next.message.selectedDocuments?.length ?? 0);
});

export default MessageBubble;
