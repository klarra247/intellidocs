'use client';

import { useEffect } from 'react';
import { FileText, File, Table2, FileCode, Check } from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useChatStore } from '@/stores/chatStore';
import { FileType } from '@/lib/types';

const fileIcons: Record<FileType, { icon: typeof FileText; color: string }> = {
  PDF: { icon: FileText, color: 'text-red-500' },
  DOCX: { icon: File, color: 'text-blue-500' },
  XLSX: { icon: Table2, color: 'text-emerald-500' },
  TXT: { icon: FileCode, color: 'text-slate-500' },
  MD: { icon: FileCode, color: 'text-slate-500' },
};

export default function DocumentSelector() {
  const { documents, loading, fetchDocuments } = useDocumentStore();
  const { selectedDocIds, toggleDocId } = useChatStore();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const indexedDocs = documents.filter((d) => d.status === 'INDEXED');

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-[13px] font-semibold text-slate-700">검색 범위</h3>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {selectedDocIds.length === 0
            ? '전체 문서에서 검색'
            : `${selectedDocIds.length}개 문서 선택됨`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg animate-shimmer" />
            ))}
          </div>
        ) : indexedDocs.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12px] text-slate-400">
            인덱싱된 문서가 없습니다
          </p>
        ) : (
          <div className="space-y-0.5">
            {indexedDocs.map((doc) => {
              const selected = selectedDocIds.includes(doc.id);
              const { icon: Icon, color } = fileIcons[doc.fileType] ?? fileIcons.TXT;

              return (
                <button
                  key={doc.id}
                  onClick={() => toggleDocId(doc.id)}
                  className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-150 ${
                    selected
                      ? 'bg-primary-50 ring-1 ring-primary-200'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.8} />
                    {selected && (
                      <div className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary-600">
                        <Check className="h-2 w-2 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <span
                    className={`truncate text-[12px] ${
                      selected
                        ? 'font-medium text-primary-700'
                        : 'text-slate-600 group-hover:text-slate-900'
                    }`}
                  >
                    {doc.originalFilename}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
