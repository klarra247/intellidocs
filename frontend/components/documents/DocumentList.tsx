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
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-100 bg-white p-4"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 animate-shimmer rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-shimmer rounded" />
                  <div className="h-3 w-1/2 animate-shimmer rounded" />
                </div>
              </div>
              <div className="mt-3 flex justify-between">
                <div className="h-5 w-16 animate-shimmer rounded-full" />
                <div className="h-4 w-12 animate-shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-5 py-4">
        <p className="text-[13px] font-medium text-red-700">{error}</p>
        <button
          onClick={() => {
            clearError();
            fetchDocuments();
          }}
          className="mt-2 text-[12px] font-medium text-red-600 underline decoration-red-300 underline-offset-2 hover:text-red-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // Empty state
  if (documents.length === 0) {
    return (
      <div className="animate-fade-in flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-white py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
          <FolderOpen
            className="h-6 w-6 text-slate-300"
            strokeWidth={1.5}
          />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-500">
          업로드된 문서가 없습니다
        </p>
        <p className="mt-1 text-xs text-slate-400">
          위 영역에 파일을 드래그하여 시작하세요
        </p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader count={documents.length} />

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      <h3 className="text-[13px] font-semibold text-slate-700">내 문서</h3>
      {count > 0 && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          {count}
        </span>
      )}
    </div>
  );
}
