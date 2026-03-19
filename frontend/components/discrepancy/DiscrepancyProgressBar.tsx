'use client';

import { useDiscrepancyStore } from '@/stores/discrepancyStore';

export default function DiscrepancyProgressBar() {
  const activeJob = useDiscrepancyStore((s) => s.activeJob);

  if (!activeJob) return null;

  const isFailed = activeJob.status === 'FAILED';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[12px]">
        <span style={{ color: isFailed ? 'var(--error)' : 'var(--text-secondary)' }}>
          {activeJob.message}
        </span>
        {!isFailed && (
          <span style={{ color: 'var(--text-tertiary)' }}>{activeJob.progress}%</span>
        )}
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--bg-active)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${isFailed ? 100 : activeJob.progress}%`,
            background: isFailed ? 'var(--error)' : 'var(--accent)',
          }}
        />
      </div>
    </div>
  );
}
