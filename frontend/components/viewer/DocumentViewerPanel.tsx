'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useViewerStore } from '@/stores/viewerStore';
import ViewerToolbar from './ViewerToolbar';
import ChunkPreview from './ChunkPreview';

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });
const ExcelViewer = dynamic(() => import('./ExcelViewer'), { ssr: false });
const ChunkTextViewer = dynamic(() => import('./ChunkTextViewer'), { ssr: false });

/** File types rendered by ChunkTextViewer */
const TEXT_BASED_TYPES = new Set(['TXT', 'MD', 'DOCX']);

export default function DocumentViewerPanel() {
  const isOpen = useViewerStore((s) => s.isOpen);
  const loading = useViewerStore((s) => s.loading);
  const error = useViewerStore((s) => s.error);
  const documentDetail = useViewerStore((s) => s.documentDetail);
  const chunkText = useViewerStore((s) => s.chunkText);
  const closeViewer = useViewerStore((s) => s.closeViewer);

  const fileType = documentDetail?.fileType ?? null;

  // ESC key closes the panel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeViewer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeViewer]);

  // Don't render anything when closed
  if (!isOpen) return null;

  const showChunkPreview =
    chunkText !== null && fileType !== null && !TEXT_BASED_TYPES.has(fileType);

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 z-30 bg-black/20 lg:hidden"
        onClick={closeViewer}
      />

      {/* Slide panel */}
      <aside
        className="fixed right-0 top-0 z-40 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-modal lg:w-1/2 animate-slide-in-right"
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
    </>
  );
}
