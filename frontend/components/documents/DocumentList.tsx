'use client';

import { useEffect } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import DocumentCard from './DocumentCard';
import DeleteConfirmModal from './DeleteConfirmModal';
import { FileText } from 'lucide-react';

export default function DocumentList() {
  const {
    documents,
    loading,
    error,
    pendingDeleteId,
    fetchDocuments,
    deleteDocument,
    setPendingDelete,
    clearError,
  } = useDocumentStore();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const pendingDoc = pendingDeleteId
    ? documents.find((d) => d.id === pendingDeleteId)
    : null;

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <SectionHeader count={0} />
        <div className="mt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="h-[18px] w-[18px] animate-shimmer rounded" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-2/5 animate-shimmer rounded" />
                <div className="h-3 w-1/4 animate-shimmer rounded" />
              </div>
              <div className="h-3 w-16 animate-shimmer rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div
        className="animate-fade-in rounded-[6px] px-4 py-3"
        style={{ background: '#fdf2f2', color: 'var(--error)' }}
      >
        <p className="text-[13px] font-medium">{error}</p>
        <button
          onClick={() => {
            clearError();
            fetchDocuments();
          }}
          className="mt-1.5 text-[12px] font-medium underline underline-offset-2"
          style={{ color: 'var(--error)' }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  // Empty state
  if (documents.length === 0) {
    return (
      <div className="animate-fade-in flex flex-col items-center py-16">
        <FileText
          size={48}
          style={{ color: 'var(--text-tertiary)' }}
          strokeWidth={1.2}
        />
        <p className="mt-4 text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          문서를 업로드하고 AI에게 물어보세요
        </p>
        <p
          className="mt-1 max-w-xs text-center text-[13px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          PDF, Excel, Word를 업로드하면 AI가 자동으로 분석 준비를 합니다
        </p>
        <button
          className="mt-5 rounded-[6px] px-4 py-2 text-[13px] font-medium text-white"
          style={{ background: 'var(--accent)' }}
          onClick={() => {
            const input = document.querySelector('[data-tour="upload-zone"] input[type="file"]') as HTMLElement | null;
            if (input) {
              input.click();
            } else {
              const dropzone = document.querySelector('[data-tour="upload-zone"] > div') as HTMLElement | null;
              dropzone?.click();
            }
          }}
        >
          문서 업로드하기
        </button>
        <div className="mt-8 w-full" style={{ borderTop: '1px solid var(--border)' }} />
        <p
          className="mt-3 text-center text-[12px] font-medium"
          style={{ color: 'var(--text-tertiary)' }}
        >
          이런 걸 할 수 있어요
        </p>
        <div className="mt-3 space-y-2 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          <p>{'\u201C'}연도별 매출을 표로 정리해줘{'\u201D'}</p>
          <p>{'\u201C'}문서 간 수치 차이 확인해줘{'\u201D'}</p>
          <p>{'\u201C'}전 분기 대비 뭐가 바뀌었어?{'\u201D'}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader count={documents.length} />

      <div
        className="mt-2 rounded-[6px]"
        style={{ border: '1px solid var(--border)', background: 'var(--bg-primary)' }}
      >
        {documents.map((doc, i) => (
          <DocumentCard key={doc.id} document={doc} index={i} />
        ))}
      </div>

      {/* Delete confirmation modal */}
      {pendingDoc && (
        <DeleteConfirmModal
          filename={pendingDoc.originalFilename}
          onConfirm={() => deleteDocument(pendingDoc.id)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

function SectionHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
        내 문서
      </h3>
      {count > 0 && (
        <span
          className="rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium"
          style={{ background: 'var(--bg-active)', color: 'var(--text-secondary)' }}
        >
          {count}
        </span>
      )}
    </div>
  );
}
