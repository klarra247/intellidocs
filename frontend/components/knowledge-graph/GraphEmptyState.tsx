'use client';

import { Share2, Upload, RefreshCw } from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useGraphStore } from '@/stores/graphStore';

interface Props {
  rebuilding?: boolean;
}

export default function GraphEmptyState({ rebuilding }: Props) {
  const documents = useDocumentStore((s) => s.documents);
  const fetchGraph = useGraphStore((s) => s.fetchGraph);
  const hasIndexedDocs = documents.some((d) => d.status === 'INDEXED');

  if (rebuilding) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        <p className="text-sm text-slate-500">Knowledge Graph 재구축 중...</p>
      </div>
    );
  }

  // Documents exist but no graph yet → extraction in progress
  if (hasIndexedDocs) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
          <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-600">
            엔티티 추출 진행 중...
          </p>
          <p className="mt-1 text-xs text-slate-400">
            업로드된 문서에서 엔티티와 관계를 추출하고 있습니다.
            <br />
            잠시 후 자동으로 표시됩니다.
          </p>
        </div>
        <button
          onClick={() => fetchGraph()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <Share2 className="h-8 w-8 text-slate-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-600">
          Knowledge Graph가 비어있습니다
        </p>
        <p className="mt-1 text-xs text-slate-400">
          문서를 업로드하면 자동으로 엔티티와 관계가 추출됩니다
        </p>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5">
        <Upload className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs text-slate-500">문서 관리에서 파일을 업로드하세요</span>
      </div>
    </div>
  );
}
