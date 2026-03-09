'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { WorkspaceMemberRole } from '@/lib/types';

interface InviteMemberModalProps {
  onClose: () => void;
  onInvited?: () => void;
}

export default function InviteMemberModal({ onClose, onInvited }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceMemberRole>('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { currentWorkspace, inviteMember } = useWorkspaceStore();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !currentWorkspace) return;

    setLoading(true);
    setError('');
    try {
      await inviteMember(currentWorkspace.id, email.trim(), role);
      setSuccess(true);
      onInvited?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '초대에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="modal-backdrop absolute inset-0 bg-slate-900/30 animate-fade-in" onClick={onClose} />
      <div className="animate-scale-in relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-modal">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>

        {success ? (
          <div className="flex flex-col items-center py-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-slate-900">초대가 발송되었습니다</h3>
            <p className="mt-1.5 text-center text-[13px] text-slate-500">
              <span className="font-medium text-slate-700">{email}</span>에게 초대 링크가 전송됩니다.
            </p>
            <button
              onClick={onClose}
              className="mt-5 rounded-lg bg-primary-600 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-700"
            >
              확인
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-[15px] font-semibold text-slate-900">멤버 초대</h3>
            <p className="mt-1 text-[13px] text-slate-500">이메일로 팀원을 초대하세요.</p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>
              )}

              <div>
                <label htmlFor="invite-email" className="block text-[13px] font-medium text-slate-700">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="invite-role" className="block text-[13px] font-medium text-slate-700">
                  역할
                </label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as WorkspaceMemberRole)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
                >
                  <option value="MEMBER">멤버</option>
                  <option value="ADMIN">관리자</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  초대
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
