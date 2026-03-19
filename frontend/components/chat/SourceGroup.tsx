'use client';

import { useState } from 'react';
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
        className="inline-flex items-center gap-1 text-[11px] transition-colors"
        style={{
          color: 'var(--accent)',
          fontWeight: isDocActive ? 500 : 400,
          cursor: hasClickable ? 'pointer' : 'default',
          opacity: hasClickable ? 1 : 0.6,
        }}
        onMouseOver={(e) => {
          if (hasClickable) (e.currentTarget as HTMLElement).style.textDecoration = 'underline';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLElement).style.textDecoration = 'none';
        }}
      >
        {truncateFilename(filename)}
        {uniquePages.length > 0 && (
          <span className="ml-0.5">
            {uniquePages.map((page, i) => {
              const isPageActive = isDocActive && viewerCurrentPage === page;
              return (
                <span key={page}>
                  {i > 0 && ', '}
                  <span
                    onClick={(e) => handlePageClick(e, page)}
                    style={{
                      color: 'var(--accent)',
                      fontWeight: isPageActive ? 700 : 400,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
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
        <div
          className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-[6px] p-3 animate-scale-in"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {filename}
          </p>
          {sources[0]?.sectionTitle && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              § {sources[0].sectionTitle}
            </p>
          )}
          {uniquePages.length > 0 && (
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              페이지 {uniquePages.join(', ')}
            </p>
          )}
          <p className="mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            {hasClickable ? '클릭하여 원문 보기' : '원문 보기 불가'}
          </p>
          {bestSource && bestSource.relevanceScore > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--bg-active)' }}>
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: `${Math.min(bestSource.relevanceScore * 100, 100)}%`,
                    background: 'var(--accent)',
                  }}
                />
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                {(bestSource.relevanceScore * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
