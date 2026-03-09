'use client';

import { useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Send,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { useViewerStore } from '@/stores/viewerStore';
import { useDocumentStore } from '@/stores/documentStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import ReviewStatusBadge from './ReviewStatusBadge';

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;
const SCALE_STEP = 0.1;

export default function ViewerToolbar() {
  const documentDetail = useViewerStore((s) => s.documentDetail);
  const closeViewer = useViewerStore((s) => s.closeViewer);
  const currentPage = useViewerStore((s) => s.currentPage);
  const totalPages = useViewerStore((s) => s.totalPages);
  const scale = useViewerStore((s) => s.scale);
  const setCurrentPage = useViewerStore((s) => s.setCurrentPage);
  const setScale = useViewerStore((s) => s.setScale);
  const activeSheet = useViewerStore((s) => s.activeSheet);
  const setActiveSheet = useViewerStore((s) => s.setActiveSheet);
  const previewData = useViewerStore((s) => s.previewData);

  const viewerTitle = useViewerStore((s) => s.viewerTitle);
  const directFileUrl = useViewerStore((s) => s.directFileUrl);
  const documentId = useViewerStore((s) => s.documentId);

  const requestReview = useDocumentStore((s) => s.requestReview);
  const submitReview = useDocumentStore((s) => s.submitReview);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const isTeam = currentWorkspace?.type === 'TEAM';

  const fileType = directFileUrl ? 'PDF' : (documentDetail?.fileType ?? null);
  const filename = viewerTitle ?? documentDetail?.originalFilename ?? '';
  const reviewStatus = documentDetail?.reviewStatus ?? 'NONE';

  // --- PDF controls ---
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  }, [currentPage, setCurrentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  }, [currentPage, totalPages, setCurrentPage]);

  const handlePageInput = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const val = parseInt((e.target as HTMLInputElement).value, 10);
        if (!isNaN(val) && val >= 1 && val <= totalPages) {
          setCurrentPage(val);
        }
      }
    },
    [totalPages, setCurrentPage],
  );

  const handleZoomOut = useCallback(() => {
    const next = Math.round((scale - SCALE_STEP) * 100) / 100;
    if (next >= MIN_SCALE) setScale(next);
  }, [scale, setScale]);

  const handleZoomIn = useCallback(() => {
    const next = Math.round((scale + SCALE_STEP) * 100) / 100;
    if (next <= MAX_SCALE) setScale(next);
  }, [scale, setScale]);

  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
      {/* Filename */}
      <span
        className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-800"
        title={filename}
      >
        {filename}
      </span>

      {/* PDF-specific controls */}
      {fileType === 'PDF' && (
        <div className="flex items-center gap-1">
          {/* Page navigation */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-0.5 text-[12px] text-slate-600">
            <input
              type="text"
              defaultValue={currentPage}
              key={currentPage}
              onKeyDown={handlePageInput}
              className="w-8 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-center text-[12px] text-slate-700 focus:border-primary-400 focus:outline-none"
              aria-label="Current page"
            />
            <span className="text-slate-400">/</span>
            <span>{totalPages}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Divider */}
          <div className="mx-1 h-4 w-px bg-slate-200" />

          {/* Zoom controls */}
          <button
            onClick={handleZoomOut}
            disabled={scale <= MIN_SCALE}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <span className="min-w-[40px] text-center text-[12px] font-medium text-slate-600">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            disabled={scale >= MAX_SCALE}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* XLSX-specific: sheet tabs */}
      {fileType === 'XLSX' && previewData && (
        <div className="flex items-center gap-1 overflow-x-auto">
          {previewData.sheets.map((sheet, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSheet(idx)}
              className={`whitespace-nowrap rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeSheet === idx
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {sheet.sheetName}
            </button>
          ))}
        </div>
      )}

      {/* Review controls (team workspace only) */}
      {isTeam && documentId && !directFileUrl && (
        <div className="flex items-center gap-1">
          <div className="mx-1 h-4 w-px bg-slate-200" />
          {reviewStatus === 'NONE' && (
            <button
              onClick={() => requestReview(documentId)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
              title="리뷰 요청"
            >
              <Send className="h-3.5 w-3.5" />
              리뷰 요청
            </button>
          )}
          {reviewStatus === 'IN_REVIEW' && (
            <>
              <ReviewStatusBadge status={reviewStatus} />
              <button
                onClick={() => submitReview(documentId, 'APPROVED')}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50"
                title="승인"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                승인
              </button>
              <button
                onClick={() => submitReview(documentId, 'REJECTED')}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50"
                title="반려"
              >
                <XCircle className="h-3.5 w-3.5" />
                반려
              </button>
            </>
          )}
          {(reviewStatus === 'APPROVED' || reviewStatus === 'REJECTED') && (
            <>
              <ReviewStatusBadge status={reviewStatus} />
              <button
                onClick={() => requestReview(documentId)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                title="다시 리뷰 요청"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                다시 요청
              </button>
            </>
          )}
        </div>
      )}

      {/* Close button */}
      <button
        onClick={closeViewer}
        className="ml-1 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="Close viewer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
