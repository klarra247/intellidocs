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
        <div
          className="h-6 w-6 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
        />
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
  const [btnHover, setBtnHover] = useState(false);

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
    <div
      className="rounded-[12px] p-5"
      style={{ border: '1px solid #fecaca', backgroundColor: '#fef2f2' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: '#fee2e2' }}
        >
          <AlertTriangle className="h-4 w-4" style={{ color: 'var(--error)' }} />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: '#7f1d1d' }}>
            워크스페이스 삭제
          </h3>
          <p className="mt-1 text-[13px] leading-5" style={{ color: '#b91c1c' }}>
            워크스페이스와 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="mt-3 rounded-[8px] px-4 py-3 text-[13px]"
          style={{ backgroundColor: '#fee2e2', color: 'var(--error)' }}
        >
          {error}
        </div>
      )}

      <div className="mt-4">
        <label
          htmlFor="confirm-delete"
          className="block text-[13px] font-medium"
          style={{ color: '#991b1b' }}
        >
          확인을 위해 <span className="font-bold">{workspaceName}</span>을 입력하세요
        </label>
        <input
          id="confirm-delete"
          type="text"
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={workspaceName}
          className="mt-1.5 w-full rounded-[8px] px-3.5 py-2.5 text-[14px] transition-colors focus:outline-none"
          style={{
            border: '1px solid #fecaca',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      <button
        onClick={handleDelete}
        disabled={loading || confirmName !== workspaceName}
        className="mt-3 flex items-center gap-2 rounded-[8px] px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50"
        style={{
          backgroundColor: btnHover ? '#dc2626' : 'var(--error)',
          color: '#ffffff',
        }}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
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
  const [btnHover, setBtnHover] = useState(false);

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
    <div
      className="rounded-[12px] p-5"
      style={{ border: '1px solid #fde68a', backgroundColor: '#fffbeb' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: '#fef3c7' }}
        >
          <AlertTriangle className="h-4 w-4" style={{ color: 'var(--warning)' }} />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: '#78350f' }}>
            워크스페이스 나가기
          </h3>
          <p className="mt-1 text-[13px] leading-5" style={{ color: '#b45309' }}>
            이 워크스페이스를 떠납니다. 다시 참여하려면 새 초대가 필요합니다.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="mt-3 rounded-[8px] px-4 py-3 text-[13px]"
          style={{ backgroundColor: '#fee2e2', color: 'var(--error)' }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleLeave}
        disabled={loading}
        className="mt-4 flex items-center gap-2 rounded-[8px] px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50"
        style={{
          backgroundColor: btnHover ? '#d97706' : 'var(--warning)',
          color: '#ffffff',
        }}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        워크스페이스 나가기
      </button>
    </div>
  );
}
