'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function GeneralTab() {
  const { currentWorkspace, workspaceDetail, updateWorkspace } = useWorkspaceStore();
  const resetTour = useOnboardingStore((s) => s.resetTour);
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [btnHover, setBtnHover] = useState(false);

  const canEdit = workspaceDetail?.myRole === 'OWNER' || workspaceDetail?.myRole === 'ADMIN';

  useEffect(() => {
    if (workspaceDetail) {
      setName(workspaceDetail.name);
      setDescription(workspaceDetail.description ?? '');
    }
  }, [workspaceDetail]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !name.trim()) return;

    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await updateWorkspace(currentWorkspace.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (!workspaceDetail) {
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
    <form onSubmit={handleSave} className="space-y-5">
      {error && (
        <div
          className="rounded-[8px] px-4 py-3 text-[13px]"
          style={{ backgroundColor: '#fef2f2', color: 'var(--error)' }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="rounded-[8px] px-4 py-3 text-[13px]"
          style={{ backgroundColor: '#f0fdf4', color: 'var(--success)' }}
        >
          저장되었습니다
        </div>
      )}

      <div>
        <label
          htmlFor="ws-general-name"
          className="block text-[13px] font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          워크스페이스 이름
        </label>
        <input
          id="ws-general-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit}
          className="mt-1.5 w-full rounded-[8px] px-3.5 py-2.5 text-[14px] transition-colors focus:outline-none disabled:opacity-60"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      <div>
        <label
          htmlFor="ws-general-desc"
          className="block text-[13px] font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          설명
        </label>
        <input
          id="ws-general-desc"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!canEdit}
          placeholder="워크스페이스에 대한 설명"
          className="mt-1.5 w-full rounded-[8px] px-3.5 py-2.5 text-[14px] transition-colors focus:outline-none disabled:opacity-60"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {canEdit && (
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="flex items-center gap-2 rounded-[8px] px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50"
          style={{
            backgroundColor: btnHover ? 'var(--accent-hover)' : 'var(--accent)',
            color: '#ffffff',
          }}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          저장
        </button>
      )}

      {/* Onboarding Tour */}
      <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
        <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          온보딩 투어
        </h3>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          IntelliDocs 사용법을 다시 확인할 수 있습니다
        </p>
        <button
          onClick={() => {
            resetTour();
            router.push('/workspace');
          }}
          className="mt-3 rounded-[6px] px-4 py-2 text-[13px] font-medium transition-colors"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            background: 'var(--bg-primary)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-primary)')}
        >
          온보딩 투어 다시 보기
        </button>
      </div>
    </form>
  );
}
