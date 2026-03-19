'use client';

import { useEffect } from 'react';
import { FileText, File, Table2, FileCode, Check } from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useChatStore } from '@/stores/chatStore';
import { FileType } from '@/lib/types';

const fileIcons: Record<FileType, { icon: typeof FileText }> = {
  PDF: { icon: FileText },
  DOCX: { icon: File },
  XLSX: { icon: Table2 },
  TXT: { icon: FileCode },
  MD: { icon: FileCode },
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
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          검색 범위
        </h3>
        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          {selectedDocIds.length === 0
            ? '전체 문서에서 검색'
            : `${selectedDocIds.length}개 문서 선택됨`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-[6px] animate-shimmer" />
            ))}
          </div>
        ) : indexedDocs.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            인덱싱된 문서가 없습니다
          </p>
        ) : (
          <div className="space-y-0.5">
            {indexedDocs.map((doc) => {
              const selected = selectedDocIds.includes(doc.id);
              const { icon: Icon } = fileIcons[doc.fileType] ?? fileIcons.TXT;

              return (
                <button
                  key={doc.id}
                  onClick={() => toggleDocId(doc.id)}
                  className="group flex w-full items-center gap-2.5 rounded-[6px] px-3 py-2 text-left transition-colors"
                  style={{
                    background: selected ? 'var(--bg-active)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div className="relative flex-shrink-0">
                    <Icon
                      className="h-4 w-4"
                      strokeWidth={1.8}
                      style={{ color: 'var(--text-tertiary)' }}
                    />
                    {selected && (
                      <div
                        className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full"
                        style={{ background: 'var(--accent)' }}
                      >
                        <Check className="h-2 w-2 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <span
                    className="truncate text-[12px]"
                    style={{
                      color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: selected ? 500 : 400,
                    }}
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
