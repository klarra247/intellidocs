'use client';

import { useState } from 'react';
import { DocumentVersion } from '@/lib/types';
import { useVersionStore } from '@/stores/versionStore';
import { useViewerStore } from '@/stores/viewerStore';
import { Loader2 } from 'lucide-react';

interface VersionNodeProps {
  version: DocumentVersion;
  isLatest: boolean;
  previousVersion?: DocumentVersion;
}

const statusStyles: Record<string, { dotColor: string; label: string; animate?: boolean }> = {
  INDEXED: { dotColor: 'var(--success)', label: '준비 완료' },
  PARSING: { dotColor: 'var(--warning)', label: '파싱 중', animate: true },
  INDEXING: { dotColor: 'var(--warning)', label: '인덱싱 중', animate: true },
  UPLOADING: { dotColor: 'var(--warning)', label: '업로드 중', animate: true },
  PARSED: { dotColor: 'var(--accent)', label: '파싱 완료' },
  FAILED: { dotColor: 'var(--error)', label: '실패' },
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
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

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
        className={`absolute ${dotOffset} top-4 ${dotSize} rounded-full z-10 ${style.animate ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: style.dotColor,
          border: '2px solid var(--bg-primary)',
        }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            v{version.versionNumber}
          </span>
          {isLatest && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              최신
            </span>
          )}
        </div>

        <p
          onClick={isClickable ? handleOpenVersion : undefined}
          className={`mt-0.5 text-[12px] truncate ${
            isClickable ? 'hover:underline cursor-pointer' : ''
          }`}
          style={{ color: isClickable ? 'var(--accent)' : 'var(--text-secondary)' }}
        >
          {version.originalFilename}
        </p>

        <div className="mt-0.5 flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          <span>{formatDate(version.createdAt)}</span>
          <span>{formatFileSize(version.fileSize)}</span>
        </div>

        {/* Status badge for non-INDEXED */}
        {version.status !== 'INDEXED' && (
          <span
            className="mt-1 inline-flex items-center gap-1 text-[11px]"
            style={{ color: version.status === 'FAILED' ? 'var(--error)' : 'var(--warning)' }}
          >
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
                  onMouseEnter={() => setHoveredBtn('view')}
                  onMouseLeave={() => setHoveredBtn(null)}
                  className="rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-colors"
                  style={{
                    border: '1px solid var(--accent-light)',
                    backgroundColor: hoveredBtn === 'view' ? 'var(--accent-light)' : 'var(--accent-light)',
                    color: 'var(--accent)',
                  }}
                >
                  비교 보기
                </button>
                <button
                  onClick={handleRunDiff}
                  disabled={diffJob != null}
                  onMouseEnter={() => setHoveredBtn('rerun')}
                  onMouseLeave={() => setHoveredBtn(null)}
                  className="text-[11px] hover:underline disabled:opacity-50"
                  style={{
                    color: hoveredBtn === 'rerun' ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                  }}
                >
                  재실행
                </button>
              </div>
            )}
            {version.diffStatus === 'COMPARING' && (
              <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <Loader2 className="h-3 w-3 animate-spin" />
                비교 진행 중...
              </span>
            )}
            {(version.diffStatus === null || version.diffStatus === undefined) && (
              <button
                onClick={handleRunDiff}
                disabled={diffJob != null}
                onMouseEnter={() => setHoveredBtn('run')}
                onMouseLeave={() => setHoveredBtn(null)}
                className="rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50"
                style={{
                  border: '1px solid var(--border)',
                  backgroundColor: hoveredBtn === 'run' ? 'var(--bg-secondary)' : 'transparent',
                  color: 'var(--text-secondary)',
                }}
              >
                비교 실행
              </button>
            )}
            {version.diffStatus === 'FAILED' && (
              <div className="flex items-center gap-2">
                <span className="text-[11px]" style={{ color: 'var(--error)' }}>비교 실패</span>
                <button
                  onClick={handleRunDiff}
                  className="text-[11px] hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  재시도
                </button>
              </div>
            )}
          </div>
        )}

        {isOnlyVersion && (
          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>(최초 버전)</p>
        )}
      </div>
    </div>
  );
}
