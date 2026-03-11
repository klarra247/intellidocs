'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useViewerStore } from '@/stores/viewerStore';
import ViewerToolbar from './ViewerToolbar';
import ChunkPreview from './ChunkPreview';

import { useDocumentCommentStore } from '@/stores/documentCommentStore';
import { X, FileText, MessageSquare, GitBranch } from 'lucide-react';

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });
const ExcelViewer = dynamic(() => import('./ExcelViewer'), { ssr: false });
const ChunkTextViewer = dynamic(() => import('./ChunkTextViewer'), { ssr: false });
const DocumentCommentTab = dynamic(() => import('./DocumentCommentTab'), { ssr: false });
const VersionTimeline = dynamic(() => import('../version/VersionTimeline'), { ssr: false });

/** File types rendered by ChunkTextViewer */
const TEXT_BASED_TYPES = new Set(['TXT', 'MD', 'DOCX']);

const MIN_WIDTH = 360;
const DEFAULT_WIDTH = 520;
const MAX_WIDTH_RATIO = 0.7; // 화면의 최대 70%
const MOBILE_BREAKPOINT = 768;

export default function DocumentViewerPanel() {
  const isOpen = useViewerStore((s) => s.isOpen);
  const loading = useViewerStore((s) => s.loading);
  const error = useViewerStore((s) => s.error);
  const documentDetail = useViewerStore((s) => s.documentDetail);
  const directFileUrl = useViewerStore((s) => s.directFileUrl);
  const chunkText = useViewerStore((s) => s.chunkText);
  const sourcePages = useViewerStore((s) => s.sourcePages);
  const closeViewer = useViewerStore((s) => s.closeViewer);
  const retryLastOpen = useViewerStore((s) => s.retryLastOpen);
  const activeTab = useViewerStore((s) => s.activeTab);
  const setActiveTab = useViewerStore((s) => s.setActiveTab);
  const documentId = useViewerStore((s) => s.documentId);
  const unresolvedCount = useDocumentCommentStore((s) => s.unresolvedCount);
  const diffCompare = useViewerStore((s) => s.diffCompare);
  const setDiffCompare = useViewerStore((s) => s.setDiffCompare);

  const fileType = directFileUrl ? 'PDF' : (documentDetail?.fileType ?? null);

  // Resizable width
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isMobile, setIsMobile] = useState(false);
  const isResizing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Mobile detection + body scroll lock
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen, isMobile]);

  // Load comment counts when document opens
  useEffect(() => {
    if (documentId && !directFileUrl) {
      useDocumentCommentStore.getState().openPanel(documentId);
    }
  }, [documentId, directFileUrl]);

  // ESC key closes the panel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeViewer();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeViewer]);

  // Drag resize handler (desktop only)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
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
  }, [width, isMobile]);

  // Swipe-to-close on mobile (swipe right)
  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (deltaX > 80) closeViewer(); // swipe right > 80px
  }, [closeViewer]);

  if (!isOpen) return null;

  const showChunkPreview =
    (chunkText !== null || sourcePages.length > 1) && fileType !== null && !TEXT_BASED_TYPES.has(fileType);

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 animate-fade-in"
          onClick={closeViewer}
        />
      )}

      <div
        ref={panelRef}
        className={
          isMobile
            ? 'fixed inset-0 z-50 flex animate-slide-in-right'
            : 'relative flex h-full flex-shrink-0 animate-slide-in-right'
        }
        style={isMobile ? undefined : { width }}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
        {/* Drag handle (desktop only) */}
        {!isMobile && (
          <div
            onMouseDown={handleMouseDown}
            className="absolute left-0 top-0 z-50 h-full w-1 cursor-col-resize hover:bg-primary-400/50 active:bg-primary-500/50"
            title="드래그하여 너비 조절"
          />
        )}

        {/* Panel content */}
        <aside
          className="flex h-full w-full flex-col border-l border-slate-200 bg-white"
          role="complementary"
          aria-label="Document viewer"
        >
          {/* Toolbar */}
          <ViewerToolbar />

          {/* Tab bar (not for direct URL mode) */}
          {!directFileUrl && documentDetail && (
            <div className="flex border-b border-slate-200 bg-white">
              <button
                onClick={() => setActiveTab('document')}
                className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-colors ${
                  activeTab === 'document'
                    ? 'border-b-2 border-primary-600 text-primary-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileText className="h-3.5 w-3.5" /> 문서
              </button>
              <button
                onClick={() => {
                  setActiveTab('comments');
                  if (documentId) {
                    useDocumentCommentStore.getState().openPanel(documentId);
                  }
                }}
                className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-colors ${
                  activeTab === 'comments'
                    ? 'border-b-2 border-primary-600 text-primary-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" /> 코멘트
                {unresolvedCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    {unresolvedCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('versions')}
                className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-colors ${
                  activeTab === 'versions'
                    ? 'border-b-2 border-primary-600 text-primary-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <GitBranch className="h-3.5 w-3.5" /> 버전
              </button>
            </div>
          )}

          {/* Main content area */}
          {activeTab === 'document' && (
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
                    <div className="mt-3 flex items-center justify-center gap-3">
                      <button
                        onClick={retryLastOpen}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-red-700 transition-colors"
                      >
                        다시 시도
                      </button>
                      <button
                        onClick={closeViewer}
                        className="text-[12px] font-medium text-red-600 underline decoration-red-300 underline-offset-2 hover:text-red-700"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!loading && !error && (documentDetail || directFileUrl) && (
                <>
                  {fileType === 'PDF' && <PdfViewer />}
                  {fileType === 'XLSX' && <ExcelViewer />}
                  {fileType !== null && TEXT_BASED_TYPES.has(fileType) && (
                    <ChunkTextViewer />
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'comments' && !directFileUrl && (
            <div className="relative flex-1 overflow-hidden">
              <DocumentCommentTab />
            </div>
          )}

          {activeTab === 'versions' && !directFileUrl && documentId && (
            <div className="relative flex-1 overflow-auto">
              <VersionTimeline documentId={documentId} />
            </div>
          )}

          {/* Chunk preview (bottom, only for PDF/XLSX when chunkText exists and on document tab) */}
          {activeTab === 'document' && showChunkPreview && <ChunkPreview />}

          {/* Diff compare bar (shown when navigating from DiffViewer numeric change click) */}
          {activeTab === 'document' && diffCompare && (
            <div className="border-t border-blue-200 bg-blue-50 px-4 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-blue-800">
                  {diffCompare.field}
                </span>
                <button
                  onClick={() => setDiffCompare(null)}
                  className="rounded p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3 text-[12px]">
                <span className="text-slate-500">
                  이전: <span className="font-mono font-medium text-red-600">{diffCompare.sourceValue}</span>
                </span>
                <span className="text-slate-300">→</span>
                <span className="text-slate-500">
                  현재: <span className="font-mono font-medium text-green-600">{diffCompare.targetValue}</span>
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
