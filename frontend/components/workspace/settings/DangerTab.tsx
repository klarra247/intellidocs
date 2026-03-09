'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export default function DangerTab() {
  const { currentWorkspace, workspaceDetail, deleteWorkspace, leaveWorkspace } = useWorkspaceStore();
  const router = useRouter();

  const isOwner = workspaceDetail?.myRole === 'OWNER';

  if (!currentWorkspace || !workspaceDetail) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isOwner ? (
        <DeleteSection
          workspaceName={currentWorkspace.name}
          onDelete={async () => {
            await deleteWorkspace(currentWorkspace.id);
            router.push('/workspace');
          }}
        />
      ) : (
        <LeaveSection
          onLeave={async () => {
            await leaveWorkspace(currentWorkspace.id);
            router.push('/workspace');
          }}
        />
      )}
    </div>
  );
}

function DeleteSection({
  workspaceName,
  onDelete,
}: {
  workspaceName: string;
  onDelete: () => Promise<void>;
}) {
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (confirmName !== workspaceName) return;
    setLoading(true);
    setError('');
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-red-900">워크스페이스 삭제</h3>
          <p className="mt-1 text-[13px] leading-5 text-red-700">
            워크스페이스와 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-red-100 px-4 py-3 text-[13px] text-red-600">{error}</div>
      )}

      <div className="mt-4">
        <label htmlFor="confirm-delete" className="block text-[13px] font-medium text-red-800">
          확인을 위해 <span className="font-bold">{workspaceName}</span>을 입력하세요
        </label>
        <input
          id="confirm-delete"
          type="text"
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={workspaceName}
          className="mt-1.5 w-full rounded-lg border border-red-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 transition-colors"
        />
      </div>

      <button
        onClick={handleDelete}
        disabled={loading || confirmName !== workspaceName}
        className="mt-3 flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        워크스페이스 삭제
      </button>
    </div>
  );
}

function LeaveSection({ onLeave }: { onLeave: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLeave = async () => {
    if (!confirm('정말로 이 워크스페이스를 나가시겠습니까?')) return;
    setLoading(true);
    setError('');
    try {
      await onLeave();
    } catch (err) {
      setError(err instanceof Error ? err.message : '나가기에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-amber-900">워크스페이스 나가기</h3>
          <p className="mt-1 text-[13px] leading-5 text-amber-700">
            이 워크스페이스를 떠납니다. 다시 참여하려면 새 초대가 필요합니다.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-red-100 px-4 py-3 text-[13px] text-red-600">{error}</div>
      )}

      <button
        onClick={handleLeave}
        disabled={loading}
        className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        워크스페이스 나가기
      </button>
    </div>
  );
}
