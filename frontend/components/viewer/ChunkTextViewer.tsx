'use client';

import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquarePlus } from 'lucide-react';
import { useViewerStore } from '@/stores/viewerStore';
import { useDocumentCommentStore } from '@/stores/documentCommentStore';
import { ChunkResponse } from '@/lib/types';

export default function ChunkTextViewer() {
  const visibleChunks = useViewerStore((s) => s.visibleChunks);
  const highlight = useViewerStore((s) => s.highlight);
  const loadedRange = useViewerStore((s) => s.loadedRange);
  const chunksLoading = useViewerStore((s) => s.chunksLoading);
  const documentDetail = useViewerStore((s) => s.documentDetail);
  const loadMoreChunks = useViewerStore((s) => s.loadMoreChunks);

  const totalChunks = documentDetail?.totalChunks ?? 0;
  const canLoadBefore = loadedRange[0] > 0;
  const canLoadAfter = loadedRange[1] < totalChunks - 1;

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      {/* Load before button */}
      {canLoadBefore && (
        <LoadMoreButton
          direction="before"
          loading={chunksLoading}
          onClick={() => loadMoreChunks('before')}
        />
      )}

      {/* Chunk cards */}
      <div className="flex flex-col gap-3">
        {visibleChunks.map((chunk) => (
          <ChunkCard
            key={chunk.chunkIndex}
            chunk={chunk}
            isHighlighted={highlight?.chunkIndex === chunk.chunkIndex}
          />
        ))}
      </div>

      {/* Load after button */}
      {canLoadAfter && (
        <LoadMoreButton
          direction="after"
          loading={chunksLoading}
          onClick={() => loadMoreChunks('after')}
        />
      )}

      {/* Empty state */}
      {visibleChunks.length === 0 && !chunksLoading && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>표시할 청크가 없습니다</p>
        </div>
      )}
    </div>
  );
}

/* ---- Chunk Card ---- */

interface ChunkCardProps {
  chunk: ChunkResponse;
  isHighlighted: boolean;
}

function ChunkCard({ chunk, isHighlighted }: ChunkCardProps) {
  const highlightRef = useRef<HTMLDivElement>(null);
  const [commentBtnHover, setCommentBtnHover] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);

  useEffect(() => {
    if (isHighlighted && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [isHighlighted]);

  const handleAddComment = () => {
    useDocumentCommentStore.getState().setPendingLocation(
      chunk.chunkIndex,
      chunk.pageNumber ?? undefined,
    );
    useViewerStore.getState().setActiveTab('comments');
    const documentId = useViewerStore.getState().documentId;
    if (documentId) {
      useDocumentCommentStore.getState().openPanel(documentId);
    }
  };

  const typeIcon = chunk.chunkType === 'TABLE' ? '\u{1F4CA}' : '\u{1F4C4}';

  return (
    <div
      ref={isHighlighted ? highlightRef : undefined}
      className="relative rounded-[6px] p-4 transition-colors"
      style={
        isHighlighted
          ? {
              border: '1px solid var(--warning)',
              backgroundColor: 'color-mix(in srgb, var(--warning) 20%, transparent)',
              boxShadow: '0 0 0 2px var(--warning)',
              animation: 'highlight-pulse 2s ease-in-out',
            }
          : {
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-primary)',
              boxShadow: 'var(--shadow-sm)',
            }
      }
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
        <span>{typeIcon}</span>
        {chunk.sectionTitle && (
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {chunk.sectionTitle}
          </span>
        )}
        {chunk.pageNumber != null && (
          <span
            className="rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            p.{chunk.pageNumber}
          </span>
        )}
        <span className="ml-auto text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          #{chunk.chunkIndex}
        </span>
      </div>

      {/* Body */}
      <div
        className={`prose-chat text-[13px] leading-relaxed ${
          chunk.chunkType === 'TABLE' ? 'overflow-x-auto' : ''
        }`}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {chunk.text ?? ''}
        </ReactMarkdown>
      </div>

      {/* Add comment button (shown on hover) */}
      <button
        onClick={handleAddComment}
        className="absolute right-2 top-2 flex items-center gap-1 rounded-[6px] px-2 py-1 text-[10px] font-medium backdrop-blur-sm transition-all"
        style={{
          border: '1px solid var(--border)',
          backgroundColor: commentBtnHover ? 'var(--accent-light)' : 'rgba(255,255,255,0.9)',
          color: commentBtnHover ? 'var(--accent)' : 'var(--text-secondary)',
          boxShadow: 'var(--shadow-sm)',
          opacity: cardHovered ? 1 : 0,
        }}
        onMouseEnter={() => setCommentBtnHover(true)}
        onMouseLeave={() => setCommentBtnHover(false)}
        title="이 위치에 코멘트 추가"
      >
        <MessageSquarePlus className="h-3 w-3" />
        코멘트
      </button>
    </div>
  );
}

/* ---- Load More Button ---- */

interface LoadMoreButtonProps {
  direction: 'before' | 'after';
  loading: boolean;
  onClick: () => void;
}

function LoadMoreButton({ direction, loading, onClick }: LoadMoreButtonProps) {
  const isBefore = direction === 'before';
  const [hovered, setHovered] = useState(false);

  return (
    <div className={`flex justify-center ${isBefore ? 'mb-3' : 'mt-3'}`}>
      <button
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50"
        style={{
          border: '1px solid var(--border)',
          backgroundColor: hovered ? 'var(--bg-hover)' : 'var(--bg-primary)',
          color: hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
          boxShadow: 'var(--shadow-sm)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {loading ? (
          <div
            className="h-3 w-3 animate-spin rounded-full"
            style={{ border: '1px solid var(--border-strong)', borderTopColor: 'var(--text-secondary)' }}
          />
        ) : isBefore ? (
          '\u25B2 더 불러오기'
        ) : (
          '\u25BC 더 불러오기'
        )}
      </button>
    </div>
  );
}
