'use client';

import { useState } from 'react';
import { ChatSource } from '@/lib/types';
import { useViewerStore } from '@/stores/viewerStore';

interface SourceBadgeProps {
  source: ChatSource;
}

function truncateFilename(name: string, max = 25): string {
  if (name.length <= max) return name;
  return name.slice(0, max) + '...';
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isActive = useViewerStore(
    (s) =>
      s.isOpen &&
      s.documentId === source.documentId &&
      s.highlight?.chunkIndex === source.chunkIndex,
  );

  const hasChunkIndex = source.chunkIndex != null;

  const handleClick = () => {
    if (!hasChunkIndex) return;
    const { openViewer, isOpen, documentId, highlight, navigateToHighlight } =
      useViewerStore.getState();
    const newHighlight = {
      chunkIndex: source.chunkIndex!,
      pageNumber: source.pageNumber,
      sectionTitle: source.sectionTitle,
    };
    // Same document already open → just navigate to highlight
    if (isOpen && documentId === source.documentId) {
      navigateToHighlight(newHighlight);
    } else {
      openViewer(source.documentId, newHighlight);
    }
  };

  const labelText = source.pageRange
    ? `${truncateFilename(source.filename)}, ${source.pageRange}`
    : truncateFilename(source.filename);

  return (
    <span className="relative inline-block">
      <span
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center gap-1 text-[11px] transition-colors"
        style={{
          color: 'var(--accent)',
          fontWeight: isActive ? 500 : 400,
          cursor: hasChunkIndex ? 'pointer' : 'default',
          opacity: hasChunkIndex ? 1 : 0.6,
          textDecoration: 'none',
        }}
        onMouseOver={(e) => {
          if (hasChunkIndex) (e.currentTarget as HTMLElement).style.textDecoration = 'underline';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLElement).style.textDecoration = 'none';
        }}
      >
        {labelText}
      </span>

      {showTooltip && (
        <div
          className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-[6px] p-3 animate-scale-in"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {source.filename}
          </p>
          {source.sectionTitle && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              § {source.sectionTitle}
            </p>
          )}
          {source.pageRange && (
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {source.pageRange}
            </p>
          )}
          <p className="mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            {hasChunkIndex ? '클릭하여 원문 보기' : '원문 보기 불가'}
          </p>
          {source.relevanceScore > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--bg-active)' }}>
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: `${Math.min(source.relevanceScore * 100, 100)}%`,
                    background: 'var(--accent)',
                  }}
                />
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                {(source.relevanceScore * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
