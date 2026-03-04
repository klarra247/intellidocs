'use client';

import { useEffect } from 'react';
import {
  Download,
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
import { reportsApi } from '@/lib/api';
import { Report, ReportType, ReportStatus } from '@/lib/types';

const typeConfig: Record<ReportType, { label: string; icon: typeof FileBarChart; color: string }> = {
  FINANCIAL_ANALYSIS: { label: '재무 분석', icon: FileBarChart, color: 'bg-blue-50 text-blue-700' },
  COMPARISON: { label: '비교 분석', icon: GitCompare, color: 'bg-violet-50 text-violet-700' },
  SUMMARY: { label: '종합 요약', icon: FileText, color: 'bg-emerald-50 text-emerald-700' },
};

const statusConfig: Record<ReportStatus, { label: string; color: string }> = {
  PENDING: { label: '대기', color: 'bg-slate-100 text-slate-600' },
  GENERATING: { label: '분석 중', color: 'bg-amber-50 text-amber-700' },
  RENDERING: { label: 'PDF 생성 중', color: 'bg-blue-50 text-blue-700' },
  COMPLETED: { label: '완료', color: 'bg-green-50 text-green-700' },
  FAILED: { label: '실패', color: 'bg-red-50 text-red-700' },
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
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (reports.length === 0 && generatingEntries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
        <FileBarChart className="mx-auto h-8 w-8 text-slate-300" strokeWidth={1.5} />
        <p className="mt-2 text-[13px] text-slate-500">
          아직 생성된 리포트가 없습니다
        </p>
        <p className="mt-0.5 text-[12px] text-slate-400">
          리포트 생성 버튼을 눌러 AI 분석 리포트를 만들어 보세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Generating / Failed (in-progress) reports */}
      {generatingEntries.map(([reportId, gen]) => (
        <GeneratingCard key={reportId} reportId={reportId} gen={gen} />
      ))}

      {/* Persisted reports */}
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

  const dismiss = () => {
    const next = new Map(generating);
    next.delete(reportId);
    useReportStore.setState({ generating: next });
  };

  if (isFailed) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
            <AlertCircle className="h-4 w-4 text-red-500" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-red-700">
              리포트 생성 실패
            </p>
            <p className="mt-0.5 text-[11px] text-red-500 truncate">
              {gen.message}
            </p>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600"
            title="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
          <Loader2 className="h-4 w-4 text-amber-600 animate-spin" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-slate-700">
            {gen.message}
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-500"
              style={{ width: `${gen.progress}%` }}
            />
          </div>
        </div>
        <span className="text-[12px] font-medium text-slate-500">
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

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isFailed
          ? 'border-red-200 bg-red-50/30'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${type.color.split(' ')[0]}`}>
          <TypeIcon className={`h-4 w-4 ${type.color.split(' ')[1]}`} strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold text-slate-900 truncate">
              {report.title}
            </h3>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${type.color}`}>
              {type.label}
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
            <span>{formatDate(report.createdAt)}</span>
            {report.fileSize != null && (
              <span>{formatFileSize(report.fileSize)}</span>
            )}
          </div>

          {isFailed && (
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-red-500">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>리포트 생성에 실패했습니다</span>
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {report.status === 'COMPLETED' && (
            <button
              onClick={() => window.open(reportsApi.downloadUrl(report.id), '_blank')}
              className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-[12px] font-medium text-primary-700 transition-colors hover:bg-primary-100"
            >
              <Download className="h-3.5 w-3.5" />
              다운로드
            </button>
          )}

          {isFailed && (
            <button
              onClick={() => retryReport(report)}
              className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[12px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
              title="재시도"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              재시도
            </button>
          )}

          <button
            onClick={() => deleteReport(report.id)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
