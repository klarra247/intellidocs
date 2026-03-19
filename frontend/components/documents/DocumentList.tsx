'use client';

import { useEffect } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import DocumentCard from './DocumentCard';
import DeleteConfirmModal from './DeleteConfirmModal';
import { FolderOpen } from 'lucide-react';

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
      <div
        className="animate-fade-in flex flex-col items-center rounded-[6px] py-16"
        style={{ border: '1px dashed var(--border)' }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-[8px]"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <FolderOpen
            className="h-5 w-5"
            style={{ color: 'var(--text-tertiary)' }}
            strokeWidth={1.5}
          />
        </div>
        <p className="mt-4 text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          업로드된 문서가 없습니다
        </p>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          위 영역에 파일을 드래그하여 시작하세요
        </p>
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
