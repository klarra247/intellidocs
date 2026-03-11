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
      return { icon: '▲', color: 'text-green-600' };
    case 'DECREASED':
      return { icon: '▼', color: 'text-red-600' };
    default:
      return { icon: '―', color: 'text-gray-400' };
  }
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export default function NumericChangesTable({ changes, onClickChange }: NumericChangesTableProps) {
  const [showAll, setShowAll] = useState(false);

  if (changes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-[12px] text-slate-400">수치 변경 없음</p>
      </div>
    );
  }

  const visible = showAll ? changes : changes.slice(0, INITIAL_COUNT);
  const hasMore = changes.length > INITIAL_COUNT;

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[560px] text-[12px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
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
                  className="border-t border-slate-100 text-slate-700 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2 font-medium truncate max-w-[140px]">
                    {c.field}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{c.period || '-'}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-500">
                    {c.sourceValue}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {c.targetValue}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatPercent(c.changePercent)}
                  </td>
                  <td className={`px-2 py-2 text-center ${dir.color}`}>
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
          className="mt-2 w-full rounded-lg border border-slate-200 py-2 text-[12px] font-medium text-slate-500 hover:bg-slate-50 transition-colors"
        >
          {showAll ? '접기' : `${changes.length - INITIAL_COUNT}건 더 보기`}
        </button>
      )}
    </div>
  );
}
