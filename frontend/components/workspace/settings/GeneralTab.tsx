'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export default function GeneralTab() {
  const { currentWorkspace, workspaceDetail, updateWorkspace } = useWorkspaceStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-[13px] text-green-600">저장되었습니다</div>
      )}

      <div>
        <label htmlFor="ws-general-name" className="block text-[13px] font-medium text-slate-700">
          워크스페이스 이름
        </label>
        <input
          id="ws-general-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit}
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors disabled:bg-slate-50 disabled:text-slate-500"
        />
      </div>

      <div>
        <label htmlFor="ws-general-desc" className="block text-[13px] font-medium text-slate-700">
          설명
        </label>
        <input
          id="ws-general-desc"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!canEdit}
          placeholder="워크스페이스에 대한 설명"
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors disabled:bg-slate-50 disabled:text-slate-500"
        />
      </div>

      {canEdit && (
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          저장
        </button>
      )}
    </form>
  );
}
