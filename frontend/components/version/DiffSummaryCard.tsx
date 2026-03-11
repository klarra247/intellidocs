'use client';

import { DiffSummary } from '@/lib/types';

interface DiffSummaryCardProps {
  summary: DiffSummary;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-green-600 border-green-200 bg-green-50',
    red: 'text-red-600 border-red-200 bg-red-50',
    yellow: 'text-yellow-600 border-yellow-200 bg-yellow-50',
    gray: 'text-slate-500 border-slate-200 bg-slate-50',
  };

  const styles = colorMap[color] ?? colorMap.gray;

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${styles}`}>
      <p className="text-[11px] font-medium opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}

export default function DiffSummaryCard({ summary }: DiffSummaryCardProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <StatCard label="추가" value={summary.added} color="green" />
      <StatCard label="삭제" value={summary.removed} color="red" />
      <StatCard label="수정" value={summary.modified} color="yellow" />
      <StatCard label="변경없음" value={summary.unchanged} color="gray" />
    </div>
  );
}
