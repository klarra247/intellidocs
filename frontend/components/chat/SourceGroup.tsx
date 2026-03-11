'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { ChatSource } from '@/lib/types';
import { useViewerStore } from '@/stores/viewerStore';

interface SourceGroupProps {
  documentId: string;
  filename: string;
  sources: ChatSource[];
}

function truncateFilename(name: string, max = 25): string {
  if (name.length <= max) return name;
  return name.slice(0, max) + '...';
}

/** Parse "p.1-3,5,7-9" → [1,2,3,5,7,8,9] */
function parsePagesFromRange(pageRange: string | null): number[] {
  if (!pageRange) return [];
  const raw = pageRange.replace(/^p\./, '');
  const pages: number[] = [];
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    const dashIdx = trimmed.indexOf('-');
    if (dashIdx >= 0) {
      const start = parseInt(trimmed.slice(0, dashIdx), 10);
      const end = parseInt(trimmed.slice(dashIdx + 1), 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let p = start; p <= end; p++) pages.push(p);
      }
    } else {
      const n = parseInt(trimmed, 10);
      if (!isNaN(n)) pages.push(n);
    }
  }
  return pages;
}

export default function SourceGroup({ documentId, filename, sources }: SourceGroupProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isDocActive = useViewerStore(
    (s) => s.isOpen && s.documentId === documentId,
  );
  const viewerCurrentPage = useViewerStore(
    (s) => s.isOpen && s.documentId === documentId ? s.currentPage : null,
  );

  // Collect pages from both pageNumber and pageRange
  const allPages: number[] = [];
  for (const s of sources) {
    if (s.pageNumber != null) allPages.push(s.pageNumber);
    allPages.push(...parsePagesFromRange(s.pageRange));
  }
  const uniquePages = Array.from(new Set(allPages)).sort((a, b) => a - b);

  const bestSource = sources
    .filter((s) => s.chunkIndex != null)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)[0];

  // Build page → chunkIndex map for viewer navigation
  const pageChunkMap: Record<number, number> = {};
  for (const s of sources) {
    if (s.pageNumber != null && s.chunkIndex != null && !(s.pageNumber in pageChunkMap)) {
      pageChunkMap[s.pageNumber] = s.chunkIndex;
    }
  }

  const handleBadgeClick = () => {
    if (!bestSource) return;
    const { openViewer, isOpen, documentId: openDocId, navigateToHighlight } =
      useViewerStore.getState();
    const highlight = {
      chunkIndex: bestSource.chunkIndex!,
      pageNumber: bestSource.pageNumber,
      sectionTitle: bestSource.sectionTitle,
    };
    if (isOpen && openDocId === documentId) {
      navigateToHighlight(highlight);
    } else {
      openViewer(documentId, highlight, uniquePages, pageChunkMap);
    }
  };

  const handlePageClick = (e: React.MouseEvent, page: number) => {
    e.stopPropagation();
    const exactMatch = sources
      .filter((s) => s.pageNumber === page && s.chunkIndex != null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)[0];

    const store = useViewerStore.getState();

    if (exactMatch) {
      const highlight = {
        chunkIndex: exactMatch.chunkIndex!,
        pageNumber: page,
        sectionTitle: exactMatch.sectionTitle,
      };
      if (store.isOpen && store.documentId === documentId) {
        store.navigateToHighlight(highlight);
      } else {
        store.openViewer(documentId, highlight, uniquePages, pageChunkMap);
      }
    } else {
      // No exact chunk for this page — use navigateToPage (will check pageChunkMap)
      if (store.isOpen && store.documentId === documentId) {
        store.navigateToPage(page);
      } else if (bestSource) {
        store.openViewer(
          documentId,
          { chunkIndex: bestSource.chunkIndex!, pageNumber: page, sectionTitle: bestSource.sectionTitle },
          uniquePages,
          pageChunkMap,
        );
      }
    }
  };

  const hasClickable = bestSource != null;

  return (
    <span className="relative inline-block">
      <span
        onClick={handleBadgeClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
          isDocActive
            ? 'bg-primary-100 text-primary-800 ring-2 ring-primary-400 ring-offset-1'
            : 'bg-primary-50 text-primary-700 hover:bg-primary-100 hover:shadow-sm'
        } ${hasClickable ? 'cursor-pointer' : 'cursor-default opacity-70'}`}
      >
        <FileText className="h-3 w-3 shrink-0" />
        {truncateFilename(filename)}
        {uniquePages.length > 0 && (
          <span className="ml-0.5 text-primary-500">
            {uniquePages.map((page, i) => {
              const isPageActive = isDocActive && viewerCurrentPage === page;
              return (
                <span key={page}>
                  {i > 0 && ', '}
                  <span
                    onClick={(e) => handlePageClick(e, page)}
                    className={`hover:underline ${isPageActive ? 'font-bold text-primary-800' : ''}`}
                  >
                    p.{page}
                  </span>
                </span>
              );
            })}
          </span>
        )}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-modal animate-scale-in">
          <p className="text-[11px] font-semibold text-slate-700">{filename}</p>
          {sources[0]?.sectionTitle && (
            <p className="mt-1 text-[11px] text-slate-500">§ {sources[0].sectionTitle}</p>
          )}
          {uniquePages.length > 0 && (
            <p className="mt-0.5 text-[11px] text-slate-400">
              페이지 {uniquePages.join(', ')}
            </p>
          )}
          <p className="mt-1 text-[10px] text-slate-400">
            {hasClickable ? '클릭하여 원문 보기' : '원문 보기 불가'}
          </p>
          {bestSource && bestSource.relevanceScore > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-1 flex-1 rounded-full bg-slate-100">
                <div
                  className="h-1 rounded-full bg-primary-400"
                  style={{ width: `${Math.min(bestSource.relevanceScore * 100, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">
                {(bestSource.relevanceScore * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
