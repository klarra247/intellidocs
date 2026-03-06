'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useViewerStore } from '@/stores/viewerStore';

export default function ChunkPreview() {
  const chunkText = useViewerStore((s) => s.chunkText);
  const chunkLoading = useViewerStore((s) => s.chunkLoading);
  const highlight = useViewerStore((s) => s.highlight);

  const [expanded, setExpanded] = useState(true);

  if (chunkText === null) return null;

  const sectionTitle = highlight?.sectionTitle;
  const pageNumber = highlight?.pageNumber;

  return (
    <div className="border-t border-slate-200 bg-white">
      {/* Header */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-[13px] font-semibold text-slate-700">
          AI가 참조한 원문
        </span>

        {/* Section info */}
        {(sectionTitle || pageNumber) && (
          <span className="text-[11px] text-slate-400">
            {sectionTitle && <span>{sectionTitle}</span>}
            {sectionTitle && pageNumber && <span> &middot; </span>}
            {pageNumber && <span>p.{pageNumber}</span>}
          </span>
        )}

        {/* Loading spinner */}
        {chunkLoading && (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-slate-200 border-t-primary-500" />
        )}

        <span className="ml-auto">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          )}
        </span>
      </button>

      {/* Collapsible content */}
      {expanded && (
        <div className="max-h-[200px] overflow-y-auto px-4 pb-3">
          {chunkLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-primary-500" />
            </div>
          ) : (
            <p className="whitespace-pre-wrap rounded-lg bg-yellow-200/60 px-3 py-2 text-[12px] leading-relaxed text-slate-700">
              {chunkText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
