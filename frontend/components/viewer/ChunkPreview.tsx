'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useViewerStore } from '@/stores/viewerStore';

/**
 * Convert pipe-delimited chunk text to valid GFM markdown table.
 *
 * Handles two formats from the PDF parser:
 * 1. Raw pipe-delimited: "col1 | col2 | col3" (no leading/trailing pipes)
 * 2. Already-wrapped: "| col1 | col2 |" with separator row
 *
 * Also cleans up empty columns that pdfplumber inserts between real columns
 * (e.g. "| | 구분 | | 2022년 |" → "| 구분 | 2022년 |").
 */
function normalizeChunkToMarkdown(text: string): string {
  const lines = text.split('\n');
  const nonEmpty = lines.filter((l) => l.trim());
  if (nonEmpty.length < 2) return text;

  const pipeLines = nonEmpty.filter(
    (l) => l.includes(' | ') || l.trim().startsWith('|'),
  );
  if (pipeLines.length / nonEmpty.length < 0.5) return text;

  const result: string[] = [];
  let tableBuffer: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length === 0) return;

    // Parse each line into an array of cell strings
    const rows = tableBuffer.map((line) => {
      let s = line.trim();
      if (s.startsWith('|')) s = s.slice(1);
      if (s.endsWith('|')) s = s.slice(0, -1);
      return s.split('|').map((cell) => cell.trim());
    });

    // Drop separator rows (every cell is dashes or empty)
    const dataRows = rows.filter(
      (row) => !row.every((cell) => !cell || /^-+$/.test(cell)),
    );

    if (dataRows.length < 2) {
      result.push(...tableBuffer);
      tableBuffer = [];
      return;
    }

    // Pad all rows to the same column count
    const maxCols = Math.max(...dataRows.map((r) => r.length));
    const padded = dataRows.map((r) => {
      const row = [...r];
      while (row.length < maxCols) row.push('');
      return row;
    });

    // Remove columns that are entirely empty
    const keepCols: number[] = [];
    for (let c = 0; c < maxCols; c++) {
      if (padded.some((row) => row[c]?.trim())) {
        keepCols.push(c);
      }
    }

    if (keepCols.length === 0) {
      result.push(...tableBuffer);
      tableBuffer = [];
      return;
    }

    const cleaned = padded.map((row) => keepCols.map((c) => row[c] || ''));

    // Build valid GFM table
    const header = `| ${cleaned[0].join(' | ')} |`;
    const sep = `| ${cleaned[0].map(() => '---').join(' | ')} |`;
    const body = cleaned.slice(1).map((r) => `| ${r.join(' | ')} |`);
    result.push([header, sep, ...body].join('\n'));

    tableBuffer = [];
  };

  for (const line of lines) {
    if (line.includes(' | ') || line.trim().startsWith('|')) {
      tableBuffer.push(line);
    } else {
      flushTable();
      result.push(line);
    }
  }
  flushTable();

  return result.join('\n');
}

export default function ChunkPreview() {
  const chunkText = useViewerStore((s) => s.chunkText);
  const chunkLoading = useViewerStore((s) => s.chunkLoading);
  const highlight = useViewerStore((s) => s.highlight);
  const sourcePages = useViewerStore((s) => s.sourcePages);
  const currentPage = useViewerStore((s) => s.currentPage);

  const [expanded, setExpanded] = useState(true);

  const hasPages = sourcePages.length > 1;
  const hasContent = chunkText !== null;

  // Show component if we have chunk text OR multiple source pages to navigate
  if (!hasContent && !hasPages) return null;

  const sectionTitle = highlight?.sectionTitle;
  const pageNumber = highlight?.pageNumber;

  const handlePageNav = (page: number) => {
    useViewerStore.getState().navigateToPage(page);
  };

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
        <div className="px-4 pb-3">
          {/* Source page navigation pills */}
          {hasPages && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">참조 페이지</span>
              {sourcePages.map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageNav(page)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                >
                  p.{page}
                </button>
              ))}
            </div>
          )}

          {/* Chunk text — rendered as markdown */}
          {chunkLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-primary-500" />
            </div>
          ) : hasContent && (
            <div className="chunk-preview-content max-h-[240px] overflow-y-auto rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {normalizeChunkToMarkdown(chunkText!)}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
