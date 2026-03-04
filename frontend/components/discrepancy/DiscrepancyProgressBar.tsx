'use client';

import { useDiscrepancyStore } from '@/stores/discrepancyStore';

export default function DiscrepancyProgressBar() {
  const activeJob = useDiscrepancyStore((s) => s.activeJob);

  if (!activeJob) return null;

  const isFailed = activeJob.status === 'FAILED';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[12px]">
        <span className={isFailed ? 'text-red-600' : 'text-slate-600'}>
          {activeJob.message}
        </span>
        {!isFailed && (
          <span className="text-slate-400">{activeJob.progress}%</span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFailed ? 'bg-red-400' : 'bg-primary-500'
          }`}
          style={{ width: `${isFailed ? 100 : activeJob.progress}%` }}
        />
      </div>
    </div>
  );
}
