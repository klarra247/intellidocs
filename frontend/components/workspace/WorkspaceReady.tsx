'use client';

import { AlertCircle } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export default function WorkspaceReady({ children }: { children: React.ReactNode }) {
  const { initialized, currentWorkspace, error, fetchWorkspaces, loading } = useWorkspaceStore();

  if (!initialized || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
          <p className="text-sm text-slate-500">워크스페이스 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (initialized && !currentWorkspace) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 max-w-sm text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <h2 className="text-[15px] font-semibold text-slate-900">워크스페이스를 불러올 수 없습니다</h2>
          <p className="text-[13px] text-slate-500">
            {error || '개인 워크스페이스가 존재하지 않습니다. 관리자에게 문의하거나 마이그레이션을 실행해주세요.'}
          </p>
          <button
            onClick={() => fetchWorkspaces()}
            className="mt-2 rounded-lg bg-primary-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-primary-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
