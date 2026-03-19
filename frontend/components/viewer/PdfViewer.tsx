'use client';

import { useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { MessageSquarePlus } from 'lucide-react';
import { useViewerStore } from '@/stores/viewerStore';
import { useDocumentCommentStore } from '@/stores/documentCommentStore';
import { documentsApi } from '@/lib/api';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export default function PdfViewer() {
  const documentId = useViewerStore((s) => s.documentId);
  const directFileUrl = useViewerStore((s) => s.directFileUrl);
  const currentPage = useViewerStore((s) => s.currentPage);
  const scale = useViewerStore((s) => s.scale);
  const sourcePages = useViewerStore((s) => s.sourcePages);
  const chunkText = useViewerStore((s) => s.chunkText);
  const setTotalPages = useViewerStore((s) => s.setTotalPages);
  const setCurrentPage = useViewerStore((s) => s.setCurrentPage);

  const [pdfError, setPdfError] = useState(false);
  const [pageWarning, setPageWarning] = useState<string | null>(null);
  const [commentBtnHover, setCommentBtnHover] = useState(false);
  const [warningCloseHover, setWarningCloseHover] = useState(false);

  const handleAddComment = () => {
    useDocumentCommentStore.getState().setPendingLocation(undefined, currentPage);
    useViewerStore.getState().setActiveTab('comments');
    if (documentId) {
      useDocumentCommentStore.getState().openPanel(documentId);
    }
  };

  const fileUrl = useMemo(
    () => directFileUrl ?? (documentId ? documentsApi.getFileUrl(documentId) : null),
    [directFileUrl, documentId],
  );

  // Show reference banner when this page is in sourcePages
  const isReferencedPage = sourcePages.includes(currentPage);
  // Show banner with chunk text indicator (has original text loaded)
  const showBanner = isReferencedPage && (chunkText !== null || sourcePages.length > 0);

  if (!fileUrl) return null;

  return (
    <div className="flex h-full w-full flex-col items-center overflow-auto" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {pageWarning && (
        <div
          className="mx-4 mt-3 flex items-center gap-2 rounded-[6px] px-3 py-2 text-[12px]"
          style={{
            border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--warning) 10%, transparent)',
            color: 'var(--warning)',
          }}
        >
          <span>{pageWarning}</span>
          <button
            onClick={() => setPageWarning(null)}
            className="ml-auto font-medium"
            style={{ color: warningCloseHover ? 'var(--text-primary)' : 'var(--warning)' }}
            onMouseEnter={() => setWarningCloseHover(true)}
            onMouseLeave={() => setWarningCloseHover(false)}
          >
            &#x2715;
          </button>
        </div>
      )}

      {/* Reference banner */}
      {showBanner && (
        <div
          className="w-full shrink-0 px-4 py-2"
          style={{
            borderBottom: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
            backgroundColor: 'var(--accent-light)',
          }}
        >
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
            <span className="text-[12px] font-medium" style={{ color: 'var(--accent)' }}>
              AI가 이 페이지의 내용을 참조했습니다
            </span>
          </div>
        </div>
      )}

      <div className="relative flex flex-1 items-start justify-center p-4">
      {/* Add comment button (floating) */}
      {!directFileUrl && (
        <button
          onClick={handleAddComment}
          className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[11px] font-medium backdrop-blur-sm transition-all"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: commentBtnHover ? 'var(--accent-light)' : 'rgba(255,255,255,0.9)',
            color: commentBtnHover ? 'var(--accent)' : 'var(--text-secondary)',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={() => setCommentBtnHover(true)}
          onMouseLeave={() => setCommentBtnHover(false)}
          title={`p.${currentPage}에 코멘트 추가`}
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          p.{currentPage} 코멘트
        </button>
      )}
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => {
          setTotalPages(numPages);
          setPdfError(false);
          const cur = useViewerStore.getState().currentPage;
          if (cur > numPages) {
            setCurrentPage(numPages);
            setPageWarning(`요청된 페이지(${cur})가 전체 ${numPages}페이지를 초과하여 마지막 페이지로 이동했습니다.`);
          } else {
            setPageWarning(null);
          }
        }}
        onLoadError={() => setPdfError(true)}
        loading={
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-6 w-6 animate-spin rounded-full"
                style={{ border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }}
              />
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>PDF 로딩 중...</p>
            </div>
          </div>
        }
        error={
          <div className="flex h-64 items-center justify-center">
            <div
              className="rounded-[8px] px-5 py-4 text-center"
              style={{
                border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--error) 10%, transparent)',
              }}
            >
              <p className="text-[13px] font-medium" style={{ color: 'var(--error)' }}>
                PDF를 불러올 수 없습니다
              </p>
            </div>
          </div>
        }
      >
        {!pdfError && (
          <Page
            pageNumber={currentPage}
            scale={scale}
            loading={
              <div className="flex h-64 items-center justify-center">
                <div
                  className="h-5 w-5 animate-spin rounded-full"
                  style={{ border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }}
                />
              </div>
            }
          />
        )}
      </Document>
      </div>
    </div>
  );
}
