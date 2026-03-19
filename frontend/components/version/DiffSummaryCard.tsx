'use client';

import { DiffSummary } from '@/lib/types';

interface DiffSummaryCardProps {
  summary: DiffSummary;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, { text: string; border: string; bg: string }> = {
    green: { text: 'var(--success)', border: 'var(--success)', bg: 'var(--success)' },
    red: { text: 'var(--error)', border: 'var(--error)', bg: 'var(--error)' },
    yellow: { text: 'var(--warning)', border: 'var(--warning)', bg: 'var(--warning)' },
    gray: { text: 'var(--text-secondary)', border: 'var(--border)', bg: 'var(--bg-secondary)' },
  };

  const styles = colorMap[color] ?? colorMap.gray;

  return (
    <div
      className="rounded-[8px] px-3 py-2.5"
      style={{
        border: `1px solid ${styles.border}`,
        backgroundColor: color === 'gray' ? styles.bg : `color-mix(in srgb, ${styles.bg} 12%, var(--bg-primary))`,
        color: styles.text,
      }}
    >
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
