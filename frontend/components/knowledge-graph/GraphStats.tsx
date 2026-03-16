'use client';

import { FileText, BarChart3, GitBranch } from 'lucide-react';
import type { GraphStats as Stats } from '@/lib/types';

interface Props {
  stats: Stats;
}

export default function GraphStats({ stats }: Props) {
  return (
    <div className="flex items-center gap-4 border-t border-slate-200 bg-white px-4 py-2 text-[11px] text-slate-500">
      <div className="flex items-center gap-1">
        <FileText className="h-3 w-3" />
        <span>문서 {stats.totalDocuments}개</span>
      </div>
      <div className="flex items-center gap-1">
        <BarChart3 className="h-3 w-3" />
        <span>지표 {stats.totalMetrics}개</span>
      </div>
      <div className="flex items-center gap-1">
        <GitBranch className="h-3 w-3" />
        <span>문서 간 연결 지표 {stats.crossDocumentMetrics}개</span>
      </div>
    </div>
  );
}
