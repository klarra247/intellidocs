'use client';

import { UploadingFile } from '@/stores/documentStore';
import { CheckCircle2, XCircle, Loader2, FileText } from 'lucide-react';

interface UploadProgressProps {
  entry: UploadingFile;
}

export default function UploadProgress({ entry }: UploadProgressProps) {
  const isDone = entry.status === 'done';
  const isError = entry.status === 'error';

  return (
    <div
      className="animate-fade-in rounded-[6px] px-4 py-3"
      style={{
        border: '1px solid var(--border)',
        background: 'var(--bg-primary)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* File icon */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px]"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <FileText className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.8} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {entry.filename}
            </p>
            <div className="ml-2 flex items-center gap-1.5">
              {isDone ? (
                <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--success)' }} strokeWidth={2} />
              ) : isError ? (
                <XCircle className="h-4 w-4" style={{ color: 'var(--error)' }} strokeWidth={2} />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent)' }} strokeWidth={2} />
              )}
              <span
                className="text-[12px] font-medium"
                style={{
                  color: isDone
                    ? 'var(--success)'
                    : isError
                      ? 'var(--error)'
                      : 'var(--text-secondary)',
                }}
              >
                {isDone ? '완료' : isError ? '실패' : `${entry.progress}%`}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div
            className="mt-1.5 h-1 overflow-hidden rounded-full"
            style={{ background: 'var(--bg-active)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${isError ? 100 : entry.progress}%`,
                background: isDone
                  ? 'var(--success)'
                  : isError
                    ? 'var(--error)'
                    : 'var(--accent)',
              }}
            />
          </div>

          {/* Status message */}
          <p
            className="mt-1 text-[11px]"
            style={{
              color: isError ? 'var(--error)' : 'var(--text-tertiary)',
            }}
          >
            {entry.message}
          </p>
        </div>
      </div>
    </div>
  );
}
