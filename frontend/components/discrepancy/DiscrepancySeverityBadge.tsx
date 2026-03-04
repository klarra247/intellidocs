'use client';

import { DiscrepancySeverity } from '@/lib/types';

const severityStyles: Record<DiscrepancySeverity, string> = {
  INFO: 'bg-slate-100 text-slate-600',
  WARNING: 'bg-amber-50 text-amber-700',
  CRITICAL: 'bg-red-50 text-red-700',
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
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${severityStyles[severity]}`}
    >
      {severityLabels[severity]}
    </span>
  );
}
