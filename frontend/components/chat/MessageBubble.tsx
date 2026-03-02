'use client';

import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { ChatMessage } from '@/lib/types';
import SourceBadge from './SourceBadge';
import TableRenderer from './TableRenderer';
import type { Components } from 'react-markdown';

const markdownComponents: Components = {
  table: ({ children, ...props }) => (
    <TableRenderer {...props}>{children}</TableRenderer>
  ),
  p: ({ children }) => <div className="mb-2 last:mb-0">{children}</div>,
};

const confidenceConfig = {
  high: { icon: ShieldCheck, label: '높은 신뢰도', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  medium: { icon: ShieldCheck, label: '보통 신뢰도', color: 'text-amber-600', bg: 'bg-amber-50' },
  low: { icon: ShieldAlert, label: '낮은 신뢰도', color: 'text-orange-600', bg: 'bg-orange-50' },
  veryLow: { icon: ShieldQuestion, label: '매우 낮은 신뢰도', color: 'text-red-500', bg: 'bg-red-50' },
};

function getConfidenceTier(confidence: number) {
  if (confidence >= 0.8) return confidenceConfig.high;
  if (confidence >= 0.5) return confidenceConfig.medium;
  if (confidence >= 0.2) return confidenceConfig.low;
  return confidenceConfig.veryLow;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

function MessageBubbleInner({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'USER';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tier = !isUser && message.confidence != null
    ? getConfidenceTier(message.confidence)
    : null;

  return (
    <div
      className={`group flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}
    >
      <div
        className={`relative max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary-600 text-white shadow-sm'
            : 'border border-slate-200 bg-white text-slate-800 shadow-card'
        }`}
      >
        {/* Copy button — AI messages only, on hover */}
        {!isUser && !isStreaming && message.content && (
          <button
            onClick={handleCopy}
            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 opacity-0 shadow-sm transition-opacity hover:text-slate-600 group-hover:opacity-100"
            title="복사"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
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
              <span className="ml-0.5 inline-block h-[18px] w-[2px] animate-pulse rounded-full bg-primary-400" />
            )}
          </div>
        )}

        {/* Confidence indicator */}
        {tier && (
          <div className={`mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${tier.color} ${tier.bg}`}>
            <tier.icon className="h-3 w-3" />
            {tier.label}
          </div>
        )}

        {/* Source badges */}
        {message.sources.length > 0 && (
          <div
            className={`mt-2.5 flex flex-wrap gap-1.5 border-t pt-2.5 ${
              isUser ? 'border-primary-500/30' : 'border-slate-100'
            }`}
          >
            {message.sources.map((source, i) => (
              <SourceBadge key={`${source.documentId}-${i}`} source={source} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const MessageBubble = memo(MessageBubbleInner, (prev, next) => {
  if (prev.isStreaming || next.isStreaming) return false;
  return prev.message.id === next.message.id;
});

export default MessageBubble;
