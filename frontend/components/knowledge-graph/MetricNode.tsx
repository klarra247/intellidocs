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

const sizeDimensions = {
  sm: { minWidth: 120, maxWidth: 150, padding: '8px 12px' },
  md: { minWidth: 150, maxWidth: 180, padding: '10px 14px' },
  lg: { minWidth: 180, maxWidth: 210, padding: '12px 16px' },
};

function getLeftBorderStyle(change: MetricChange | null): string | undefined {
  if (!change) return undefined;
  switch (change.direction) {
    case 'increase': return '3px solid #4dab9a';
    case 'decrease': return '3px solid #e03e3e';
    default: return undefined;
  }
}

function ChangeIcon({ direction }: { direction?: string }) {
  switch (direction) {
    case 'increase':
      return <TrendingUp style={{ height: 12, width: 12, color: '#4dab9a' }} />;
    case 'decrease':
      return <TrendingDown style={{ height: 12, width: 12, color: '#e03e3e' }} />;
    default:
      return <Minus style={{ height: 12, width: 12, color: '#b4b4b0' }} />;
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

function getSummaryColor(change: MetricChange | null): string {
  if (change?.direction === 'increase') return '#4dab9a';
  if (change?.direction === 'decrease') return '#e03e3e';
  return '#787774';
}

function MetricNode({ data }: { data: MetricNodeData }) {
  const { label, occurrences = [], change, selected, dimmed, size } = data;
  const summary = formatSummary(occurrences, change);
  const dims = sizeDimensions[size];
  const leftBorder = getLeftBorderStyle(change);

  return (
    <div
      style={{
        minWidth: dims.minWidth,
        maxWidth: dims.maxWidth,
        padding: dims.padding,
        borderRadius: 8,
        border: selected ? '1px solid #2383e2' : '1px solid #e9e9e7',
        borderLeft: leftBorder ?? (selected ? '1px solid #2383e2' : '1px solid #e9e9e7'),
        background: '#f7f7f5',
        textAlign: 'center',
        transition: 'all 0.15s',
        opacity: dimmed ? 0.3 : 1,
        outline: selected ? '2px solid #2383e2' : 'none',
        outlineOffset: selected ? 1 : 0,
        cursor: 'pointer',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: 'transparent', border: 'none', width: 12, height: 12 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: 'transparent', border: 'none', width: 12, height: 12 }} />

      <div className="flex items-center justify-center gap-1">
        {change && <ChangeIcon direction={change.direction} />}
        <span style={{ fontSize: 12, fontWeight: 700, color: '#37352f' }} className="truncate">{label}</span>
      </div>

      {summary && (
        <p
          style={{ marginTop: 2, fontSize: 10, lineHeight: 1.3, color: getSummaryColor(change) }}
          className="truncate"
        >
          {summary}
        </p>
      )}

      {occurrences.length > 1 && (
        <p style={{ marginTop: 2, fontSize: 9, color: '#b4b4b0' }}>
          {occurrences.length}개 문서
        </p>
      )}
    </div>
  );
}

export default memo(MetricNode);
