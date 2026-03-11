'use client';

import { DocumentVersion } from '@/lib/types';
import { useVersionStore } from '@/stores/versionStore';
import { useViewerStore } from '@/stores/viewerStore';
import { Loader2 } from 'lucide-react';

interface VersionNodeProps {
  version: DocumentVersion;
  isLatest: boolean;
  previousVersion?: DocumentVersion;
}

const statusStyles: Record<string, { dot: string; label: string }> = {
  INDEXED: { dot: 'bg-green-500', label: '준비 완료' },
  PARSING: { dot: 'bg-yellow-500 animate-pulse', label: '파싱 중' },
  INDEXING: { dot: 'bg-yellow-500 animate-pulse', label: '인덱싱 중' },
  UPLOADING: { dot: 'bg-yellow-500 animate-pulse', label: '업로드 중' },
  PARSED: { dot: 'bg-blue-500', label: '파싱 완료' },
  FAILED: { dot: 'bg-red-500', label: '실패' },
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VersionNode({ version, isLatest, previousVersion }: VersionNodeProps) {
  const { requestDiff, fetchDiff, diffJob } = useVersionStore();

  const style = statusStyles[version.status] ?? statusStyles.INDEXED;
  const dotSize = isLatest ? 'w-4 h-4' : 'w-3 h-3';
  const dotOffset = isLatest ? '-left-[1px]' : 'left-[1px]';

  const handleViewDiff = () => {
    if (version.diffId) {
      fetchDiff(version.diffId);
    }
  };

  const handleRunDiff = () => {
    if (!previousVersion) return;
    requestDiff(previousVersion.documentId, version.documentId);
  };

  const handleOpenVersion = () => {
    if (version.status === 'INDEXED') {
      useViewerStore.getState().openViewer(version.documentId);
    }
  };

  const isOnlyVersion = !previousVersion && version.versionNumber === 1;
  const isClickable = version.status === 'INDEXED';

  return (
    <div className="relative flex items-start gap-3 py-3 pl-6">
      {/* Dot on timeline */}
      <div
        className={`absolute ${dotOffset} top-4 ${dotSize} rounded-full ${style.dot} border-2 border-white z-10`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-800">
            v{version.versionNumber}
          </span>
          {isLatest && (
            <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-600">
              최신
            </span>
          )}
        </div>

        <p
          onClick={isClickable ? handleOpenVersion : undefined}
          className={`mt-0.5 text-[12px] truncate ${
            isClickable
              ? 'text-primary-600 hover:text-primary-700 hover:underline cursor-pointer'
              : 'text-slate-600'
          }`}
        >
          {version.originalFilename}
        </p>

        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
          <span>{formatDate(version.createdAt)}</span>
          <span>{formatFileSize(version.fileSize)}</span>
        </div>

        {/* Status badge for non-INDEXED */}
        {version.status !== 'INDEXED' && (
          <span className={`mt-1 inline-flex items-center gap-1 text-[11px] ${
            version.status === 'FAILED' ? 'text-red-500' : 'text-yellow-600'
          }`}>
            {(version.status === 'PARSING' || version.status === 'INDEXING' || version.status === 'UPLOADING') && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {style.label}
          </span>
        )}

        {/* Diff button */}
        {previousVersion && version.status === 'INDEXED' && (
          <div className="mt-2">
            {version.diffStatus === 'COMPLETED' && version.diffId && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleViewDiff}
                  className="rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-700 hover:bg-primary-100 transition-colors"
                >
                  비교 보기
                </button>
                <button
                  onClick={handleRunDiff}
                  disabled={diffJob != null}
                  className="text-[11px] text-slate-400 hover:text-slate-600 hover:underline disabled:opacity-50"
                >
                  재실행
                </button>
              </div>
            )}
            {version.diffStatus === 'COMPARING' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                비교 진행 중...
              </span>
            )}
            {(version.diffStatus === null || version.diffStatus === undefined) && (
              <button
                onClick={handleRunDiff}
                disabled={diffJob != null}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                비교 실행
              </button>
            )}
            {version.diffStatus === 'FAILED' && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-red-500">비교 실패</span>
                <button
                  onClick={handleRunDiff}
                  className="text-[11px] text-primary-600 hover:underline"
                >
                  재시도
                </button>
              </div>
            )}
          </div>
        )}

        {isOnlyVersion && (
          <p className="mt-1 text-[11px] text-slate-400">(최초 버전)</p>
        )}
      </div>
    </div>
  );
}
