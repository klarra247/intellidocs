'use client';

import { useRef } from 'react';
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
  Plus,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { useViewerStore } from '@/stores/viewerStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';
import ReviewStatusBadge from '@/components/viewer/ReviewStatusBadge';

const fileTypeIcon: Record<FileType, typeof FileText> = {
  PDF: FileText,
  DOCX: FileType2,
  XLSX: FileSpreadsheet,
  TXT: File,
  MD: FileText,
};

const statusConfig: Record<
  DocumentStatus,
  { label: string; dotColor: string; spinning?: boolean }
> = {
  UPLOADING: { label: '업로드 중', dotColor: 'var(--warning)', spinning: true },
  PARSING: { label: '파싱 중', dotColor: 'var(--warning)', spinning: true },
  PARSED: { label: '파싱 완료', dotColor: 'var(--accent)' },
  INDEXING: { label: '인덱싱 중', dotColor: 'var(--warning)', spinning: true },
  INDEXED: { label: '준비 완료', dotColor: 'var(--success)' },
  FAILED: { label: '실패', dotColor: 'var(--error)' },
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
  const versionInputRef = useRef<HTMLInputElement>(null);

  const isTeam = currentWorkspace?.type === 'TEAM';
  const isMyDoc = !document.uploaderId || document.uploaderId === currentUser?.id;
  const canDelete = !isTeam || isMyDoc || currentWorkspace?.role === 'OWNER' || currentWorkspace?.role === 'ADMIN';

  const FileIcon = fileTypeIcon[document.fileType] ?? fileTypeIcon.TXT;
  const stConfig = statusConfig[document.status];

  const isProcessing = ['UPLOADING', 'PARSING', 'INDEXING'].includes(document.status);
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

  const handleVersionUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    versionInputRef.current?.click();
  };

  const handleVersionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;
    const { useVersionStore } = await import('@/stores/versionStore');
    await useVersionStore.getState().uploadNewVersion(document.id, file);
    if (versionInputRef.current) versionInputRef.current.value = '';
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group flex items-center gap-3 rounded-[6px] px-3 py-2.5 transition-colors animate-fade-in ${
        isReady ? 'cursor-pointer' : ''
      }`}
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* File icon */}
      <FileIcon
        className="h-[18px] w-[18px] shrink-0"
        style={{ color: 'var(--text-tertiary)' }}
        strokeWidth={1.8}
      />

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className="truncate text-[13px] font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {document.originalFilename}
          </p>
          {document.versionNumber != null && document.versionNumber > 1 && (
            <span
              className="shrink-0 rounded px-1 py-0.5 text-[10px] font-medium"
              style={{ background: 'var(--bg-active)', color: 'var(--text-secondary)' }}
            >
              v{document.versionNumber}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          <span>{document.fileType}</span>
          {document.fileSize != null && (
            <>
              <span>·</span>
              <span>{formatFileSize(document.fileSize)}</span>
            </>
          )}
          {document.createdAt && (
            <>
              <span>·</span>
              <span>{formatRelativeDate(document.createdAt)}</span>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 shrink-0">
        <ReviewStatusBadge status={document.reviewStatus} size="sm" />
        {(document.unresolvedCommentCount ?? 0) > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const viewer = useViewerStore.getState();
              viewer.openViewer(document.id);
              setTimeout(() => viewer.setActiveTab('comments'), 200);
            }}
            className="flex items-center gap-0.5 text-[11px] font-medium transition-colors"
            style={{ color: 'var(--warning)' }}
          >
            <MessageCircle className="h-3 w-3" />
            {document.unresolvedCommentCount}
          </button>
        )}
        <div className="flex items-center gap-1.5">
          {isProcessing ? (
            <Loader2
              className="h-3 w-3 animate-spin"
              style={{ color: stConfig.dotColor }}
            />
          ) : (
            <span
              className="inline-block h-[6px] w-[6px] rounded-full"
              style={{ background: stConfig.dotColor }}
            />
          )}
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {stConfig.label}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 shrink-0">
        {isReady && (
          <>
            <input
              ref={versionInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.xlsx,.txt,.md"
              onClick={(e) => e.stopPropagation()}
              onChange={handleVersionFileChange}
            />
            <button
              onClick={handleVersionUpload}
              className="rounded-[4px] p-1.5 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-active)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
              title="새 버전 추가"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </>
        )}
        {isReady && (
          <button
            onClick={handlePreview}
            className="rounded-[4px] p-1.5 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-active)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
            title="미리보기"
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
        {canDelete && (
          <button
            onClick={handleDelete}
            className="rounded-[4px] p-1.5 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-active)';
              e.currentTarget.style.color = 'var(--error)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
            title="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
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
