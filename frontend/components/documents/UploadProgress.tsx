'use client';

import { UploadingFile } from '@/stores/documentStore';
import { CheckCircle2, XCircle, Loader2, FileText } from 'lucide-react';

interface UploadProgressProps {
  entry: UploadingFile;
}

const statusConfig = {
  uploading: {
    barColor: 'bg-primary-500',
    textColor: 'text-slate-600',
    icon: Loader2,
    iconClass: 'text-primary-500 animate-spin',
  },
  processing: {
    barColor: 'bg-primary-500 animate-progress-pulse',
    textColor: 'text-slate-600',
    icon: Loader2,
    iconClass: 'text-primary-500 animate-spin',
  },
  done: {
    barColor: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    icon: CheckCircle2,
    iconClass: 'text-emerald-500 animate-check-pop',
  },
  error: {
    barColor: 'bg-red-500',
    textColor: 'text-red-600',
    icon: XCircle,
    iconClass: 'text-red-500',
  },
};

export default function UploadProgress({ entry }: UploadProgressProps) {
  const config = statusConfig[entry.status];
  const Icon = config.icon;

  return (
    <div className="animate-slide-up rounded-lg border border-slate-150 bg-white px-4 py-3 shadow-card">
      <div className="flex items-center gap-3">
        {/* File icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
          <FileText className="h-4 w-4 text-slate-400" strokeWidth={2} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="truncate text-[13px] font-medium text-slate-800">
              {entry.filename}
            </p>
            <div className="ml-2 flex items-center gap-1.5">
              <Icon className={`h-4 w-4 ${config.iconClass}`} strokeWidth={2} />
              <span className={`text-xs font-medium ${config.textColor}`}>
                {entry.status === 'done'
                  ? '완료'
                  : entry.status === 'error'
                    ? '실패'
                    : `${entry.progress}%`}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${config.barColor}`}
              style={{ width: `${entry.status === 'error' ? 100 : entry.progress}%` }}
            />
          </div>

          {/* Status message */}
          <p className={`mt-1 text-[11px] ${config.textColor}`}>
            {entry.message}
          </p>
        </div>
      </div>
    </div>
  );
}
