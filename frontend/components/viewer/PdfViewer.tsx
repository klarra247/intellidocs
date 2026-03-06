'use client';

import { useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useViewerStore } from '@/stores/viewerStore';
import { documentsApi } from '@/lib/api';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export default function PdfViewer() {
  const documentId = useViewerStore((s) => s.documentId);
  const currentPage = useViewerStore((s) => s.currentPage);
  const scale = useViewerStore((s) => s.scale);
  const setTotalPages = useViewerStore((s) => s.setTotalPages);

  const [pdfError, setPdfError] = useState(false);

  const fileUrl = useMemo(
    () => (documentId ? documentsApi.getFileUrl(documentId) : null),
    [documentId],
  );

  if (!fileUrl) return null;

  return (
    <div className="flex h-full w-full items-start justify-center overflow-auto bg-slate-50 p-4">
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => {
          setTotalPages(numPages);
          setPdfError(false);
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
  );
}
