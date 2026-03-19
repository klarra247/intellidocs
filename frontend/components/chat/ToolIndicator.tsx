'use client';

import { Loader2, Search, ClipboardList, ArrowLeftRight, BarChart3, Calculator, Ratio, TrendingUp } from 'lucide-react';
import { ActiveTool } from '@/lib/types';

const toolConfig: Record<string, { icon: typeof Search; label: string }> = {
  searchDocuments: { icon: Search, label: '문서 검색 중...' },
  summarizeDocument: { icon: ClipboardList, label: '문서 요약 중...' },
  compareDocuments: { icon: ArrowLeftRight, label: '문서 비교 중...' },
  extractAndCompile: { icon: BarChart3, label: '데이터 추출 중...' },
  calculateChange: { icon: Calculator, label: '변화율 계산 중...' },
  calculateFinancialRatio: { icon: Ratio, label: '재무비율 계산 중...' },
  analyzeTrend: { icon: TrendingUp, label: '트렌드 분석 중...' },
};

interface ToolIndicatorProps {
  tools: ActiveTool[];
}

export default function ToolIndicator({ tools }: ToolIndicatorProps) {
  if (tools.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {tools.map((tool) => {
        const config = toolConfig[tool.tool];
        const ToolIcon = config?.icon;
        return (
          <div
            key={tool.tool}
            className="inline-flex items-center gap-2 rounded-[6px] px-3 py-2 text-[12px] animate-fade-in"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Loader2
              className="h-3.5 w-3.5 animate-spin"
              style={{ color: 'var(--accent)' }}
              strokeWidth={1.6}
            />
            {ToolIcon && (
              <ToolIcon
                className="h-3.5 w-3.5"
                style={{ color: 'var(--text-secondary)' }}
                strokeWidth={1.6}
              />
            )}
            <span>{config?.label ?? tool.message ?? `${tool.tool} 실행 중...`}</span>
          </div>
        );
      })}
    </div>
  );
}
