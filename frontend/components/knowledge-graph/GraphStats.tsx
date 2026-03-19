'use client';

import { FileText, BarChart3, GitBranch } from 'lucide-react';
import type { GraphStats as Stats } from '@/lib/types';

interface Props {
  stats: Stats;
}

export default function GraphStats({ stats }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        borderTop: '1px solid #e9e9e7',
        background: '#ffffff',
        padding: '8px 16px',
        fontSize: 11,
        color: '#b4b4b0',
      }}
    >
      <div className="flex items-center gap-1">
        <FileText style={{ height: 12, width: 12 }} />
        <span>문서 {stats.totalDocuments}개</span>
      </div>
      <div className="flex items-center gap-1">
        <BarChart3 style={{ height: 12, width: 12 }} />
        <span>지표 {stats.totalMetrics}개</span>
      </div>
      <div className="flex items-center gap-1">
        <GitBranch style={{ height: 12, width: 12 }} />
        <span>문서 간 연결 지표 {stats.crossDocumentMetrics}개</span>
      </div>
    </div>
  );
}
