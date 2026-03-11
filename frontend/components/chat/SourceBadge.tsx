'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
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
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
          isActive
            ? 'bg-primary-100 text-primary-800 ring-2 ring-primary-400 ring-offset-1'
            : 'bg-primary-50 text-primary-700 hover:bg-primary-100 hover:shadow-sm'
        } ${hasChunkIndex ? 'cursor-pointer' : 'cursor-default opacity-70'}`}
      >
        <FileText className="h-3 w-3 shrink-0" />
        {labelText}
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
