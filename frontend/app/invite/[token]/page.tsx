'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Users, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { invitationsApi } from '@/lib/api';
import { PendingInvitation } from '@/lib/types';

const roleLabel: Record<string, string> = {
  OWNER: '소유자',
  ADMIN: '관리자',
  MEMBER: '멤버',
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { fetchWorkspaces } = useWorkspaceStore();

  const [invitation, setInvitation] = useState<PendingInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<'accepted' | 'declined' | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/auth/login?redirect=/invite/${token}`);
    }
  }, [authLoading, isAuthenticated, router, token]);

  // Fetch pending invitations and match token
  useEffect(() => {
    if (!isAuthenticated) return;

    (async () => {
      setLoading(true);
      try {
        const pending = await invitationsApi.pending();
        const match = pending.find((inv) => inv.token === token);
        if (match) {
          setInvitation(match);
        } else {
          setError('초대를 찾을 수 없거나 이미 처리되었습니다');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '초대 정보를 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, token]);

  const handleAccept = async () => {
    setActionLoading(true);
    setError('');
    try {
      await invitationsApi.accept(token);
      setResult('accepted');
      await fetchWorkspaces();
      setTimeout(() => router.push('/workspace'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수락에 실패했습니다');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    setError('');
    try {
      await invitationsApi.decline(token);
      setResult('declined');
      setTimeout(() => router.push('/workspace'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '거절에 실패했습니다');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        {loading ? (
          <div className="flex flex-col items-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
            <p className="mt-3 text-[13px] text-slate-500">초대 정보 확인 중...</p>
          </div>
        ) : result === 'accepted' ? (
          <div className="flex flex-col items-center py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <h2 className="mt-4 text-[16px] font-bold text-slate-900">초대를 수락했습니다</h2>
            <p className="mt-1.5 text-[13px] text-slate-500">워크스페이스로 이동합니다...</p>
          </div>
        ) : result === 'declined' ? (
          <div className="flex flex-col items-center py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <XCircle className="h-6 w-6 text-slate-400" />
            </div>
            <h2 className="mt-4 text-[16px] font-bold text-slate-900">초대를 거절했습니다</h2>
            <p className="mt-1.5 text-[13px] text-slate-500">메인 페이지로 이동합니다...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="mt-4 text-[16px] font-bold text-slate-900">초대 오류</h2>
            <p className="mt-1.5 text-center text-[13px] text-slate-500">{error}</p>
            <button
              onClick={() => router.push('/workspace')}
              className="mt-5 rounded-lg bg-primary-600 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-700"
            >
              메인으로 돌아가기
            </button>
          </div>
        ) : invitation ? (
          <>
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <h2 className="mt-4 text-[16px] font-bold text-slate-900">워크스페이스 초대</h2>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <div className="space-y-2.5">
                <div>
                  <p className="text-[11px] font-medium uppercase text-slate-400">워크스페이스</p>
                  <p className="mt-0.5 text-[14px] font-semibold text-slate-900">{invitation.workspaceName}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase text-slate-400">초대자</p>
                  <p className="mt-0.5 text-[14px] text-slate-700">{invitation.inviterName}</p>
                  <p className="text-[12px] text-slate-400">{invitation.inviterEmail}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase text-slate-400">역할</p>
                  <p className="mt-0.5 text-[14px] text-slate-700">{roleLabel[invitation.role] ?? invitation.role}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                onClick={handleDecline}
                disabled={actionLoading}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                거절
              </button>
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                수락
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
