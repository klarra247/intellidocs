'use client';

import { useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useViewerStore } from '@/stores/viewerStore';
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
    <div className="flex h-full w-full flex-col items-center overflow-auto bg-slate-50">
      {pageWarning && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
          <span>{pageWarning}</span>
          <button onClick={() => setPageWarning(null)} className="ml-auto font-medium text-amber-600 hover:text-amber-800">✕</button>
        </div>
      )}

      {/* Reference banner */}
      {showBanner && (
        <div className="w-full shrink-0 border-b border-primary-200 bg-primary-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-primary-400" />
            <span className="text-[12px] font-medium text-primary-700">
              AI가 이 페이지의 내용을 참조했습니다
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-1 items-start justify-center p-4">
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
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
              <p className="text-[12px] text-slate-400">PDF 로딩 중...</p>
            </div>
          </div>
        }
        error={
          <div className="flex h-64 items-center justify-center">
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-center">
              <p className="text-[13px] font-medium text-red-700">
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
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
              </div>
            }
          />
        )}
      </Document>
      </div>
    </div>
  );
}
