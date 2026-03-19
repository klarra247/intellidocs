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
    <div
      className="rounded-[8px] px-4 py-3"
      style={{
        border: `1px solid ${isFailed ? 'var(--error)' : 'var(--accent)'}`,
        backgroundColor: isFailed
          ? 'color-mix(in srgb, var(--error) 8%, var(--bg-primary))'
          : 'var(--accent-light)',
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[12px] font-medium"
          style={{ color: isFailed ? 'var(--error)' : 'var(--accent)' }}
        >
          {diffJob.message}
        </span>
        <span
          className="text-[11px]"
          style={{ color: isFailed ? 'var(--error)' : 'var(--accent)' }}
        >
          {Math.round(displayProgress)}%
        </span>
      </div>
      <div
        className="rounded-full h-2"
        style={{
          backgroundColor: isFailed
            ? 'color-mix(in srgb, var(--error) 15%, var(--bg-primary))'
            : 'color-mix(in srgb, var(--accent) 15%, var(--bg-primary))',
        }}
      >
        <div
          className="h-2 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${displayProgress}%`,
            backgroundColor: isFailed ? 'var(--error)' : 'var(--accent)',
          }}
        />
      </div>
    </div>
  );
}
