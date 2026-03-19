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
  const [closeBtnHover, setCloseBtnHover] = useState(false);
  const [cancelBtnHover, setCancelBtnHover] = useState(false);
  const [submitBtnHover, setSubmitBtnHover] = useState(false);
  const [confirmBtnHover, setConfirmBtnHover] = useState(false);

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
      <div
        className="modal-backdrop absolute inset-0 animate-fade-in"
        style={{ backgroundColor: 'rgba(55, 53, 47, 0.3)' }}
        onClick={onClose}
      />
      <div
        className="animate-scale-in relative mx-4 w-full max-w-md rounded-[12px] p-6"
        style={{
          backgroundColor: 'var(--bg-primary)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-[8px] p-1.5 transition-colors"
          style={{
            color: closeBtnHover ? 'var(--text-primary)' : 'var(--text-tertiary)',
            backgroundColor: closeBtnHover ? 'var(--bg-hover)' : 'transparent',
          }}
          onMouseEnter={() => setCloseBtnHover(true)}
          onMouseLeave={() => setCloseBtnHover(false)}
        >
          <X className="h-4 w-4" />
        </button>

        {success ? (
          <div className="flex flex-col items-center py-4">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: '#f0fdf4' }}
            >
              <CheckCircle className="h-5 w-5" style={{ color: 'var(--success)' }} />
            </div>
            <h3
              className="mt-4 text-[15px] font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              초대가 발송되었습니다
            </h3>
            <p className="mt-1.5 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{email}</span>
              에게 초대 링크가 전송됩니다.
            </p>
            <button
              onClick={onClose}
              className="mt-5 rounded-[8px] px-6 py-2.5 text-[13px] font-semibold transition-colors"
              style={{
                backgroundColor: confirmBtnHover ? 'var(--accent-hover)' : 'var(--accent)',
                color: '#ffffff',
              }}
              onMouseEnter={() => setConfirmBtnHover(true)}
              onMouseLeave={() => setConfirmBtnHover(false)}
            >
              확인
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              멤버 초대
            </h3>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              이메일로 팀원을 초대하세요.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {error && (
                <div
                  className="rounded-[8px] px-4 py-3 text-[13px]"
                  style={{ backgroundColor: '#fef2f2', color: 'var(--error)' }}
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="invite-email"
                  className="block text-[13px] font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  이메일 <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="mt-1.5 w-full rounded-[8px] px-3.5 py-2.5 text-[14px] transition-colors focus:outline-none"
                  style={{
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="invite-role"
                  className="block text-[13px] font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  역할
                </label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as WorkspaceMemberRole)}
                  className="mt-1.5 w-full rounded-[8px] px-3.5 py-2.5 text-[14px] transition-colors focus:outline-none"
                  style={{
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="MEMBER">멤버</option>
                  <option value="ADMIN">관리자</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-[8px] px-4 py-2.5 text-[13px] font-medium transition-colors"
                  style={{
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    backgroundColor: cancelBtnHover ? 'var(--bg-hover)' : 'transparent',
                  }}
                  onMouseEnter={() => setCancelBtnHover(true)}
                  onMouseLeave={() => setCancelBtnHover(false)}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[8px] px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: submitBtnHover ? 'var(--accent-hover)' : 'var(--accent)',
                    color: '#ffffff',
                  }}
                  onMouseEnter={() => setSubmitBtnHover(true)}
                  onMouseLeave={() => setSubmitBtnHover(false)}
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
