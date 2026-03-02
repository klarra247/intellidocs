'use client';

import { Loader2 } from 'lucide-react';
import { ActiveTool } from '@/lib/types';

const toolLabels: Record<string, string> = {
  searchDocuments: '🔍 문서 검색 중...',
  summarizeDocument: '📋 문서 요약 중...',
  compareDocuments: '🔄 문서 비교 중...',
  extractAndCompile: '📊 데이터 추출 중...',
  calculateChange: '🧮 변화율 계산 중...',
  calculateFinancialRatio: '📐 재무비율 계산 중...',
  analyzeTrend: '📈 트렌드 분석 중...',
};

interface ToolIndicatorProps {
  tools: ActiveTool[];
}

export default function ToolIndicator({ tools }: ToolIndicatorProps) {
  if (tools.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {tools.map((tool) => (
        <div
          key={tool.tool}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-700 animate-fade-in"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{toolLabels[tool.tool] ?? tool.message ?? `${tool.tool} 실행 중...`}</span>
        </div>
      ))}
    </div>
  );
}
