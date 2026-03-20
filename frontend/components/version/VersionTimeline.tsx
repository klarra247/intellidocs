'use client';

import { useEffect } from 'react';
import { useVersionStore } from '@/stores/versionStore';
import VersionNode from './VersionNode';
import VersionUploadButton from './VersionUploadButton';
import DiffProgressBar from './DiffProgressBar';
import { GitBranch, Loader2 } from 'lucide-react';

interface VersionTimelineProps {
  documentId: string;
}

export default function VersionTimeline({ documentId }: VersionTimelineProps) {
  const { versions, loading, error, fetchVersions, diffJob } = useVersionStore();

  useEffect(() => {
    fetchVersions(documentId);
  }, [documentId, fetchVersions]);

  if (loading && versions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-[12px]" style={{ color: 'var(--error)' }}>{error}</p>
        <button
          onClick={() => fetchVersions(documentId)}
          className="mt-2 text-[12px] hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  // Sort versions descending (latest first)
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <div className="px-4 py-4 space-y-4">
      <VersionUploadButton documentId={documentId} />

      {diffJob && <DiffProgressBar />}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center py-10">
          <GitBranch className="h-10 w-10" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.2} />
          <p className="mt-3 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
            새 버전을 업로드하면 변경 사항을 자동으로 비교합니다
          </p>
        </div>
      ) : (
        <div className="relative ml-3">
          {/* Timeline line */}
          <div
            className="absolute left-[7px] top-2 bottom-2 w-[2px]"
            style={{ backgroundColor: 'var(--border)' }}
          />

          <div className="space-y-0">
            {sorted.map((version, idx) => {
              const isLatest = idx === 0;
              const previousVersion = idx < sorted.length - 1 ? sorted[idx + 1] : undefined;
              return (
                <VersionNode
                  key={version.documentId}
                  version={version}
                  isLatest={isLatest}
                  previousVersion={previousVersion}
                />
              );
            })}
          </div>
        </div>
      )}

      {sorted.length === 1 && (
        <p className="mt-4 text-center text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          새 버전을 업로드하면 이전 버전과의 차이를 자동으로 비교합니다
        </p>
      )}
    </div>
  );
}
