'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useViewerStore } from '@/stores/viewerStore';
import ViewerToolbar from './ViewerToolbar';
import ChunkPreview from './ChunkPreview';

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });
const ExcelViewer = dynamic(() => import('./ExcelViewer'), { ssr: false });
const ChunkTextViewer = dynamic(() => import('./ChunkTextViewer'), { ssr: false });

/** File types rendered by ChunkTextViewer */
const TEXT_BASED_TYPES = new Set(['TXT', 'MD', 'DOCX']);

const MIN_WIDTH = 360;
const DEFAULT_WIDTH = 520;
const MAX_WIDTH_RATIO = 0.7; // 화면의 최대 70%

export default function DocumentViewerPanel() {
  const isOpen = useViewerStore((s) => s.isOpen);
  const loading = useViewerStore((s) => s.loading);
  const error = useViewerStore((s) => s.error);
  const documentDetail = useViewerStore((s) => s.documentDetail);
  const chunkText = useViewerStore((s) => s.chunkText);
  const closeViewer = useViewerStore((s) => s.closeViewer);

  const fileType = documentDetail?.fileType ?? null;

  // Resizable width
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isResizing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC key closes the panel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeViewer();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeViewer]);

  // Drag resize handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = startX - e.clientX; // drag left = increase width
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO;
      const newWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, startWidth + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [width]);

  if (!isOpen) return null;

  const showChunkPreview =
    chunkText !== null && fileType !== null && !TEXT_BASED_TYPES.has(fileType);

  return (
    <div
      ref={panelRef}
      className="relative flex h-full flex-shrink-0 animate-slide-in-right"
      style={{ width }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 z-50 h-full w-1 cursor-col-resize hover:bg-primary-400/50 active:bg-primary-500/50"
        title="드래그하여 너비 조절"
      />

      {/* Panel content */}
      <aside
        className="flex h-full w-full flex-col border-l border-slate-200 bg-white"
        role="complementary"
        aria-label="Document viewer"
      >
        {/* Toolbar */}
        <ViewerToolbar />

        {/* Main content area */}
        <div className="relative flex-1 overflow-auto">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
            </div>
          )}

          {error && !loading && (
            <div className="flex h-full items-center justify-center p-6">
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-center">
                <p className="text-[13px] font-medium text-red-700">{error}</p>
                <button
                  onClick={closeViewer}
                  className="mt-2 text-[12px] font-medium text-red-600 underline decoration-red-300 underline-offset-2 hover:text-red-700"
                >
                  닫기
                </button>
              </div>
            </div>
          )}

          {!loading && !error && documentDetail && (
            <>
              {fileType === 'PDF' && <PdfViewer />}
              {fileType === 'XLSX' && <ExcelViewer />}
              {fileType !== null && TEXT_BASED_TYPES.has(fileType) && (
                <ChunkTextViewer />
              )}
            </>
          )}
        </div>

        {/* Chunk preview (bottom, only for PDF/XLSX when chunkText exists) */}
        {showChunkPreview && <ChunkPreview />}
      </aside>
    </div>
  );
}
