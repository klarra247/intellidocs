'use client';

import Link from 'next/link';
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
        <div
          className="h-8 w-8 animate-spin rounded-full border-2"
          style={{ borderColor: '#e8f0fe', borderTopColor: '#2383e2' }}
        />
        <p style={{ fontSize: 14, color: '#787774' }}>Knowledge Graph 재구축 중...</p>
      </div>
    );
  }

  // Documents exist but no graph yet → extraction in progress
  if (hasIndexedDocs) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8">
        <div
          style={{
            display: 'flex',
            height: 64,
            width: 64,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
            background: '#f7f7f5',
          }}
        >
          <RefreshCw
            style={{ height: 32, width: 32, color: '#cb912f', animationDuration: '3s' }}
            className="animate-spin"
          />
        </div>
        <div className="text-center">
          <p style={{ fontSize: 14, fontWeight: 500, color: '#787774' }}>
            엔티티 추출 진행 중...
          </p>
          <p style={{ marginTop: 4, fontSize: 12, color: '#b4b4b0' }}>
            업로드된 문서에서 엔티티와 관계를 추출하고 있습니다.
            <br />
            잠시 후 자동으로 표시됩니다.
          </p>
        </div>
        <button
          onClick={() => fetchGraph()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
            border: '1px solid #e9e9e7',
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 500,
            color: '#787774',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0ee')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <RefreshCw style={{ height: 14, width: 14 }} />
          새로고침
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-8">
      <div className="flex flex-col items-center">
        <Share2 className="h-12 w-12" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.2} />
        <h3 className="mt-5 text-[16px] font-semibold text-center" style={{ color: 'var(--text-primary)' }}>
          문서를 업로드하면 자동으로 Knowledge Graph가 생성됩니다
        </h3>
        <p className="mt-1.5 text-[13px] text-center max-w-xs" style={{ color: 'var(--text-secondary)' }}>
          문서에서 핵심 지표를 추출하고, 문서 간 관계를 시각화합니다
        </p>
        <Link href="/workspace" className="mt-4 text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
          문서 업로드하러 가기
        </Link>
      </div>
    </div>
  );
}
