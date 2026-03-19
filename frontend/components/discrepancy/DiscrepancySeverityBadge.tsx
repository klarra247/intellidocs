'use client';

import { DiscrepancySeverity } from '@/lib/types';

const severityStyles: Record<DiscrepancySeverity, { background: string; color: string }> = {
  INFO: { background: 'var(--bg-active)', color: 'var(--text-secondary)' },
  WARNING: { background: 'var(--bg-secondary)', color: 'var(--warning)' },
  CRITICAL: { background: 'var(--bg-secondary)', color: 'var(--error)' },
};

const severityLabels: Record<DiscrepancySeverity, string> = {
  INFO: '경미',
  WARNING: '주의',
  CRITICAL: '심각',
};

export default function DiscrepancySeverityBadge({
  severity,
}: {
  severity: DiscrepancySeverity;
}) {
  const styles = severityStyles[severity];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: styles.background, color: styles.color }}
    >
      {severityLabels[severity]}
    </span>
  );
}
