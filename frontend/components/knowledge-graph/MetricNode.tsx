'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MetricOccurrence, MetricChange } from '@/lib/types';

interface MetricNodeData {
  label: string;
  occurrences: MetricOccurrence[];
  change: MetricChange | null;
  selected: boolean;
  dimmed: boolean;
  size: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'min-w-[120px] max-w-[150px] px-3 py-2',
  md: 'min-w-[150px] max-w-[180px] px-3.5 py-2.5',
  lg: 'min-w-[180px] max-w-[210px] px-4 py-3',
};

function getChangeStyle(change: MetricChange | null) {
  if (!change) return 'bg-gray-50 border-gray-300';
  switch (change.direction) {
    case 'increase':
      return 'bg-green-50 border-green-400';
    case 'decrease':
      return 'bg-red-50 border-red-400';
    default:
      return 'bg-gray-50 border-gray-300';
  }
}

function ChangeIcon({ direction }: { direction?: string }) {
  switch (direction) {
    case 'increase':
      return <TrendingUp className="h-3 w-3 text-green-600" />;
    case 'decrease':
      return <TrendingDown className="h-3 w-3 text-red-600" />;
    default:
      return <Minus className="h-3 w-3 text-gray-400" />;
  }
}

function formatSummary(occurrences: MetricOccurrence[], change: MetricChange | null): string {
  if (occurrences.length === 0) return '';
  if (occurrences.length === 1) {
    const o = occurrences[0];
    const period = o.period ? ` (${o.period})` : '';
    return `${o.value || '-'}${period}`;
  }
  if (change && change.changePercent != null) {
    const sign = change.changePercent > 0 ? '+' : '';
    return `${change.from} → ${change.to} (${sign}${change.changePercent}%)`;
  }
  return `${occurrences.length}개 문서`;
}

function MetricNode({ data }: { data: MetricNodeData }) {
  const { label, occurrences = [], change, selected, dimmed, size } = data;
  const changeStyle = getChangeStyle(change);
  const summary = formatSummary(occurrences, change);

  return (
    <div
      className={`rounded-xl border-2 text-center shadow-sm transition-all duration-150 ${changeStyle} ${sizeStyles[size]} ${
        selected ? 'ring-2 ring-primary-500 ring-offset-1' : ''
      } ${dimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-3 !h-3" />

      <div className="flex items-center justify-center gap-1">
        {change && <ChangeIcon direction={change.direction} />}
        <span className="text-xs font-bold text-slate-800 truncate">{label}</span>
      </div>

      {summary && (
        <p className={`mt-0.5 text-[10px] leading-tight truncate ${
          change?.direction === 'increase' ? 'text-green-700' :
          change?.direction === 'decrease' ? 'text-red-700' :
          'text-slate-500'
        }`}>
          {summary}
        </p>
      )}

      {occurrences.length > 1 && (
        <p className="mt-0.5 text-[9px] text-slate-400">
          {occurrences.length}개 문서
        </p>
      )}
    </div>
  );
}

export default memo(MetricNode);
