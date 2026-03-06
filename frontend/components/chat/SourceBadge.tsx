'use client';

import { useState } from 'react';
import { ChatSource } from '@/lib/types';
import { useViewerStore } from '@/stores/viewerStore';

interface SourceBadgeProps {
  source: ChatSource;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const hasChunkIndex = source.chunkIndex != null;

  const handleClick = () => {
    if (!hasChunkIndex) return;
    const { openViewer } = useViewerStore.getState();
    openViewer(source.documentId, {
      chunkIndex: source.chunkIndex!,
      pageNumber: source.pageNumber,
      sectionTitle: source.sectionTitle,
    });
  };

  const label = source.pageRange
    ? `📄 ${source.filename}, ${source.pageRange}`
    : `📄 ${source.filename}`;

  return (
    <span className="relative inline-block">
      <span
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-700 transition-all hover:bg-primary-100 hover:shadow-sm ${
          hasChunkIndex ? 'cursor-pointer' : 'cursor-default opacity-70'
        }`}
      >
        {label}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-modal animate-scale-in">
          <p className="text-[11px] font-semibold text-slate-700">
            {source.filename}
          </p>
          {source.sectionTitle && (
            <p className="mt-1 text-[11px] text-slate-500">
              § {source.sectionTitle}
            </p>
          )}
          {source.pageRange && (
            <p className="mt-0.5 text-[11px] text-slate-400">
              {source.pageRange}
            </p>
          )}
          <p className="mt-1 text-[10px] text-slate-400">
            {hasChunkIndex ? '클릭하여 원문 보기' : '원문 보기 불가'}
          </p>
          {source.relevanceScore > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-1 flex-1 rounded-full bg-slate-100">
                <div
                  className="h-1 rounded-full bg-primary-400"
                  style={{ width: `${Math.min(source.relevanceScore * 100, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">
                {(source.relevanceScore * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
