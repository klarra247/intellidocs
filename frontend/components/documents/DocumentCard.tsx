'use client';

import { useRouter } from 'next/navigation';
import { Document, DocumentStatus, FileType } from '@/lib/types';
import { useDocumentStore } from '@/stores/documentStore';
import {
  FileText,
  FileSpreadsheet,
  FileType2,
  File,
  Trash2,
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { useViewerStore } from '@/stores/viewerStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';

// File type → icon + color
const fileTypeConfig: Record<
  FileType,
  { icon: typeof FileText; bg: string; iconColor: string }
> = {
  PDF: { icon: FileText, bg: 'bg-red-50', iconColor: 'text-red-500' },
  DOCX: { icon: FileType2, bg: 'bg-blue-50', iconColor: 'text-blue-500' },
  XLSX: {
    icon: FileSpreadsheet,
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
  },
  TXT: { icon: File, bg: 'bg-slate-50', iconColor: 'text-slate-500' },
  MD: { icon: FileText, bg: 'bg-purple-50', iconColor: 'text-purple-500' },
};

// Status → badge config
const statusConfig: Record<
  DocumentStatus,
  { label: string; bg: string; text: string; icon: typeof Clock }
> = {
  UPLOADING: {
    label: '업로드 중',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    icon: Loader2,
  },
  PARSING: {
    label: '파싱 중',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: Loader2,
  },
  PARSED: {
    label: '파싱 완료',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: Clock,
  },
  INDEXING: {
    label: '인덱싱 중',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    icon: Loader2,
  },
  INDEXED: {
    label: '준비 완료',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: CheckCircle2,
  },
  FAILED: {
    label: '실패',
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: XCircle,
  },
};

interface DocumentCardProps {
  document: Document;
  index?: number;
}

export default function DocumentCard({ document, index = 0 }: DocumentCardProps) {
  const { setPendingDelete } = useDocumentStore();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  const isTeam = currentWorkspace?.type === 'TEAM';
  const isMyDoc = !document.uploaderId || document.uploaderId === currentUser?.id;
  const canDelete = !isTeam || isMyDoc || currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN';

  const ftConfig = fileTypeConfig[document.fileType] ?? fileTypeConfig.TXT;
  const stConfig = statusConfig[document.status];
  const StatusIcon = stConfig.icon;
  const FileIcon = ftConfig.icon;

  const isProcessing = ['UPLOADING', 'PARSING', 'INDEXING'].includes(
    document.status,
  );
  const isReady = document.status === 'INDEXED';

  const handleCardClick = () => {
    if (isReady) {
      router.push(`/workspace/chat?documentId=${document.id}`);
    }
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    useViewerStore.getState().openViewer(document.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDelete(document.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`animate-slide-up group relative rounded-xl border bg-white p-4 shadow-card transition-all duration-200 stagger-${Math.min(index + 1, 6)} ${
        isReady
          ? 'cursor-pointer border-slate-200/80 hover:border-primary-200 hover:shadow-card-hover'
          : 'border-slate-200/60'
      }`}
      style={{ opacity: 0 }}
    >
      {/* Top row: icon + name + delete */}
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ftConfig.bg}`}
        >
          <FileIcon
            className={`h-[18px] w-[18px] ${ftConfig.iconColor}`}
            strokeWidth={2}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-800">
            {document.originalFilename}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {document.fileType}
            {document.fileSize != null && ` \u00b7 ${formatFileSize(document.fileSize)}`}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          {isReady && (
            <button
              onClick={handlePreview}
              className="rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-primary-50 hover:text-primary-500 group-hover:opacity-100"
              title="미리보기"
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              title="삭제"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom row: status + metadata */}
      <div className="mt-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${stConfig.bg} ${stConfig.text}`}
        >
          <StatusIcon
            className={`h-3 w-3 ${isProcessing ? 'animate-spin' : ''}`}
            strokeWidth={2}
          />
          {stConfig.label}
        </span>

        <span className="text-[11px] text-slate-300">
          {document.createdAt ? formatRelativeDate(document.createdAt) : ''}
        </span>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHr < 24) return `${diffHr}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}
