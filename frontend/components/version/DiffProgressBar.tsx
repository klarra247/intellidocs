'use client';

import { useState, useEffect, useRef } from 'react';
import { useVersionStore } from '@/stores/versionStore';

export default function DiffProgressBar() {
  const diffJob = useVersionStore((s) => s.diffJob);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate gradual progress while waiting for SSE events
  useEffect(() => {
    if (!diffJob) {
      setSimulatedProgress(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // If real progress is ahead, jump to it
    if (diffJob.progress > simulatedProgress) {
      setSimulatedProgress(diffJob.progress);
      return;
    }

    // Start simulated progress if stuck at low values
    if (diffJob.progress < 10 && simulatedProgress < 30) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setSimulatedProgress((prev) => {
          // Slow down as it approaches 30% (never exceed real progress ceiling)
          if (prev >= 30) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return prev;
          }
          const increment = prev < 10 ? 2 : prev < 20 ? 1 : 0.5;
          return Math.min(30, prev + increment);
        });
      }, 500);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [diffJob, diffJob?.progress, simulatedProgress]);

  if (!diffJob) return null;

  const isFailed = diffJob.status === 'FAILED';
  const displayProgress = Math.max(diffJob.progress, simulatedProgress);

  return (
    <div className={`rounded-xl border px-4 py-3 ${isFailed ? 'border-red-200 bg-red-50' : 'border-primary-200 bg-primary-50'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[12px] font-medium ${isFailed ? 'text-red-700' : 'text-primary-700'}`}>
          {diffJob.message}
        </span>
        <span className={`text-[11px] ${isFailed ? 'text-red-500' : 'text-primary-500'}`}>
          {Math.round(displayProgress)}%
        </span>
      </div>
      <div className={`rounded-full h-2 ${isFailed ? 'bg-red-100' : 'bg-primary-100'}`}>
        <div
          className={`h-2 rounded-full transition-all duration-500 ease-out ${isFailed ? 'bg-red-500' : 'bg-primary-500'}`}
          style={{ width: `${displayProgress}%` }}
        />
      </div>
    </div>
  );
}
