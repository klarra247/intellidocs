'use client';

import { useState } from 'react';
import { NumericChange } from '@/lib/types';

interface NumericChangesTableProps {
  changes: NumericChange[];
  onClickChange?: (change: NumericChange) => void;
}

const INITIAL_COUNT = 10;

function directionDisplay(direction: string) {
  switch (direction) {
    case 'INCREASED':
      return { icon: '\u25B2', color: 'var(--success)' };
    case 'DECREASED':
      return { icon: '\u25BC', color: 'var(--error)' };
    default:
      return { icon: '\u2015', color: 'var(--text-tertiary)' };
  }
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export default function NumericChangesTable({ changes, onClickChange }: NumericChangesTableProps) {
  const [showAll, setShowAll] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredMore, setHoveredMore] = useState(false);

  if (changes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>수치 변경 없음</p>
      </div>
    );
  }

  const visible = showAll ? changes : changes.slice(0, INITIAL_COUNT);
  const hasMore = changes.length > INITIAL_COUNT;

  return (
    <div>
      <div
        className="overflow-x-auto rounded-[6px]"
        style={{ border: '1px solid var(--border)' }}
      >
        <table className="w-full min-w-[560px] text-[12px]">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <th className="px-3 py-2 text-left font-medium">항목</th>
              <th className="px-3 py-2 text-left font-medium">기간</th>
              <th className="px-3 py-2 text-right font-medium">이전 값</th>
              <th className="px-3 py-2 text-right font-medium">현재 값</th>
              <th className="px-3 py-2 text-right font-medium">변동</th>
              <th className="px-2 py-2 text-center font-medium">방향</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c, i) => {
              const dir = directionDisplay(c.direction);
              return (
                <tr
                  key={i}
                  onClick={() => onClickChange?.(c)}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className="cursor-pointer transition-colors"
                  style={{
                    borderTop: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    backgroundColor: hoveredRow === i ? 'var(--bg-secondary)' : 'transparent',
                  }}
                >
                  <td className="px-3 py-2 font-medium truncate max-w-[140px]">
                    {c.field}
                  </td>
                  <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{c.period || '-'}</td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {c.sourceValue}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {c.targetValue}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatPercent(c.changePercent)}
                  </td>
                  <td className="px-2 py-2 text-center" style={{ color: dir.color }}>
                    {dir.icon}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          onMouseEnter={() => setHoveredMore(true)}
          onMouseLeave={() => setHoveredMore(false)}
          className="mt-2 w-full rounded-[6px] py-2 text-[12px] font-medium transition-colors"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            backgroundColor: hoveredMore ? 'var(--bg-secondary)' : 'transparent',
          }}
        >
          {showAll ? '접기' : `${changes.length - INITIAL_COUNT}건 더 보기`}
        </button>
      )}
    </div>
  );
}
