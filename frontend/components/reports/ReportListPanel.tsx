'use client';

import { useEffect, useState } from 'react';
import {
  Download,
  Eye,
  FileBarChart,
  GitCompare,
  FileText,
  Loader2,
  AlertCircle,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useReportStore } from '@/stores/reportStore';
import { useViewerStore } from '@/stores/viewerStore';
import { reportsApi } from '@/lib/api';
import { Report, ReportType, ReportStatus } from '@/lib/types';

const typeConfig: Record<ReportType, { label: string; icon: typeof FileBarChart; bg: string; color: string }> = {
  FINANCIAL_ANALYSIS: { label: '재무 분석', icon: FileBarChart, bg: 'var(--accent-light)', color: 'var(--accent)' },
  COMPARISON: { label: '비교 분석', icon: GitCompare, bg: 'var(--bg-secondary)', color: 'var(--accent)' },
  SUMMARY: { label: '종합 요약', icon: FileText, bg: 'var(--bg-secondary)', color: 'var(--success)' },
};

const statusConfig: Record<ReportStatus, { label: string; bg: string; color: string }> = {
  PENDING: { label: '대기', bg: 'var(--bg-active)', color: 'var(--text-secondary)' },
  GENERATING: { label: '분석 중', bg: 'var(--bg-secondary)', color: 'var(--warning)' },
  RENDERING: { label: 'PDF 생성 중', bg: 'var(--accent-light)', color: 'var(--accent)' },
  COMPLETED: { label: '완료', bg: 'var(--bg-secondary)', color: 'var(--success)' },
  FAILED: { label: '실패', bg: 'var(--bg-secondary)', color: 'var(--error)' },
};

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReportListPanel() {
  const { reports, loading, generating, fetchReports } = useReportStore();

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const generatingEntries = Array.from(generating.entries());

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-tertiary)' }}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (reports.length === 0 && generatingEntries.length === 0) {
    return (
      <div
        className="rounded-[8px] py-12 text-center"
        style={{ border: '1px dashed var(--border)' }}
      >
        <FileBarChart className="mx-auto h-8 w-8" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.5} />
        <p className="mt-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          아직 생성된 리포트가 없습니다
        </p>
        <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          리포트 생성 버튼을 눌러 AI 분석 리포트를 만들어 보세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {generatingEntries.map(([reportId, gen]) => (
        <GeneratingCard key={reportId} reportId={reportId} gen={gen} />
      ))}

      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </div>
  );
}

function GeneratingCard({
  reportId,
  gen,
}: {
  reportId: string;
  gen: { progress: number; message: string; status: ReportStatus };
}) {
  const { generating } = useReportStore();
  const isFailed = gen.status === 'FAILED';
  const [dismissHover, setDismissHover] = useState(false);

  const dismiss = () => {
    const next = new Map(generating);
    next.delete(reportId);
    useReportStore.setState({ generating: next });
  };

  if (isFailed) {
    return (
      <div
        className="rounded-[8px] p-4"
        style={{ border: '1px solid var(--error)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-[6px]"
            style={{ background: 'var(--bg-active)' }}
          >
            <AlertCircle className="h-4 w-4" style={{ color: 'var(--error)' }} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium" style={{ color: 'var(--error)' }}>
              리포트 생성 실패
            </p>
            <p className="mt-0.5 text-[11px] truncate" style={{ color: 'var(--error)' }}>
              {gen.message}
            </p>
          </div>
          <button
            onClick={dismiss}
            onMouseEnter={() => setDismissHover(true)}
            onMouseLeave={() => setDismissHover(false)}
            className="shrink-0 rounded-[6px] p-1.5 transition-colors"
            style={{
              color: dismissHover ? 'var(--error)' : 'var(--text-tertiary)',
              background: dismissHover ? 'var(--bg-hover)' : 'transparent',
            }}
            title="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[8px] p-4"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-primary)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[6px]"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--warning)' }} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
            {gen.message}
          </p>
          <div
            className="mt-2 h-1.5 w-full rounded-full overflow-hidden"
            style={{ background: 'var(--bg-active)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${gen.progress}%`, background: 'var(--accent)' }}
            />
          </div>
        </div>
        <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {gen.progress}%
        </span>
      </div>
    </div>
  );
}

function ReportCard({ report }: { report: Report }) {
  const { deleteReport, retryReport } = useReportStore();
  const type = typeConfig[report.reportType];
  const status = statusConfig[report.status];
  const TypeIcon = type.icon;
  const isFailed = report.status === 'FAILED';

  const [cardHover, setCardHover] = useState(false);
  const [viewHover, setViewHover] = useState(false);
  const [dlHover, setDlHover] = useState(false);
  const [retryHover, setRetryHover] = useState(false);
  const [deleteHover, setDeleteHover] = useState(false);

  return (
    <div
      className="rounded-[8px] p-4 transition-colors"
      onMouseEnter={() => setCardHover(true)}
      onMouseLeave={() => setCardHover(false)}
      style={{
        border: `1px solid ${isFailed ? 'var(--error)' : cardHover ? 'var(--border-strong)' : 'var(--border)'}`,
        background: isFailed ? 'var(--bg-secondary)' : 'var(--bg-primary)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px]"
          style={{ background: type.bg }}
        >
          <TypeIcon className="h-4 w-4" style={{ color: type.color }} strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {report.title}
            </h3>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: type.bg, color: type.color }}
            >
              {type.label}
            </span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: status.bg, color: status.color }}
            >
              {status.label}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            <span>{formatDate(report.createdAt)}</span>
            {report.fileSize != null && (
              <span>{formatFileSize(report.fileSize)}</span>
            )}
          </div>

          {isFailed && (
            <div className="mt-2 flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--error)' }}>
              <AlertCircle className="h-3.5 w-3.5" />
              <span>리포트 생성에 실패했습니다</span>
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {report.status === 'COMPLETED' && (
            <>
              <button
                onClick={() =>
                  useViewerStore.getState().openViewerWithUrl(
                    report.title,
                    reportsApi.downloadUrl(report.id),
                  )
                }
                onMouseEnter={() => setViewHover(true)}
                onMouseLeave={() => setViewHover(false)}
                className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[12px] font-medium transition-colors"
                style={{
                  background: viewHover ? 'var(--bg-active)' : 'var(--bg-secondary)',
                  color: viewHover ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
                title="뷰어로 보기"
              >
                <Eye className="h-3.5 w-3.5" />
                보기
              </button>
              <button
                onClick={() => window.open(reportsApi.downloadUrl(report.id), '_blank')}
                onMouseEnter={() => setDlHover(true)}
                onMouseLeave={() => setDlHover(false)}
                className="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition-colors"
                style={{
                  background: dlHover ? 'var(--accent)' : 'var(--accent-light)',
                  color: dlHover ? '#ffffff' : 'var(--accent)',
                }}
              >
                <Download className="h-3.5 w-3.5" />
                다운로드
              </button>
            </>
          )}

          {isFailed && (
            <button
              onClick={() => retryReport(report)}
              onMouseEnter={() => setRetryHover(true)}
              onMouseLeave={() => setRetryHover(false)}
              className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[12px] font-medium transition-colors"
              style={{
                background: retryHover ? 'var(--bg-active)' : 'var(--bg-secondary)',
                color: 'var(--warning)',
              }}
              title="재시도"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              재시도
            </button>
          )}

          <button
            onClick={() => deleteReport(report.id)}
            onMouseEnter={() => setDeleteHover(true)}
            onMouseLeave={() => setDeleteHover(false)}
            className="rounded-[6px] p-1.5 transition-colors"
            style={{
              color: deleteHover ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              background: deleteHover ? 'var(--bg-hover)' : 'transparent',
            }}
            title="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
