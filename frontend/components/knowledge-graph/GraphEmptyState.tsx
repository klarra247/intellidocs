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
        <Share2 style={{ height: 32, width: 32, color: '#b4b4b0' }} />
      </div>
      <div className="text-center">
        <p style={{ fontSize: 14, fontWeight: 500, color: '#787774' }}>
          Knowledge Graph가 비어있습니다
        </p>
        <p style={{ marginTop: 4, fontSize: 12, color: '#b4b4b0' }}>
          문서를 업로드하면 자동으로 엔티티와 관계가 추출됩니다
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          borderRadius: 8,
          background: '#f7f7f5',
          padding: '6px 12px',
        }}
      >
        <Upload style={{ height: 14, width: 14, color: '#b4b4b0' }} />
        <span style={{ fontSize: 12, color: '#787774' }}>문서 관리에서 파일을 업로드하세요</span>
      </div>
    </div>
  );
}
