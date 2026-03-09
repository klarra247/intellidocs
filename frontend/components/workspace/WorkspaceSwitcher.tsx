'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Users, ChevronDown, Check, Plus, Settings, Mail, Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Workspace, PendingInvitation } from '@/lib/types';
import CreateWorkspaceModal from './CreateWorkspaceModal';

const roleBadge: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-slate-100 text-slate-500',
};

const roleLabel: Record<string, string> = {
  OWNER: '소유자',
  ADMIN: '관리자',
  MEMBER: '멤버',
};

export default function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { workspaces, currentWorkspace, switchWorkspace, pendingInvitations, acceptInvitation, declineInvitation } = useWorkspaceStore();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!currentWorkspace) return null;

  const isTeam = currentWorkspace.type === 'TEAM';

  return (
    <>
      <div ref={ref} className="relative">
        {/* Trigger */}
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-50"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50">
            {isTeam ? (
              <Users className="h-3.5 w-3.5 text-primary-600" strokeWidth={2.5} />
            ) : (
              <FolderOpen className="h-3.5 w-3.5 text-primary-600" strokeWidth={2.5} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-slate-900">
              {currentWorkspace.name}
            </p>
            <p className="text-[11px] text-slate-400">
              {isTeam ? `팀 · ${currentWorkspace.memberCount}명` : '개인'}
            </p>
          </div>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 animate-scale-in rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
            <div className="max-h-[240px] overflow-y-auto px-1.5">
              {workspaces.map((ws) => (
                <WorkspaceItem
                  key={ws.id}
                  workspace={ws}
                  isCurrent={ws.id === currentWorkspace.id}
                  onSelect={() => {
                    switchWorkspace(ws.id);
                    setOpen(false);
                  }}
                />
              ))}
            </div>

            {/* Pending invitations */}
            {pendingInvitations.length > 0 && (
              <>
                <div className="mx-1.5 my-1 border-t border-slate-100" />
                <div className="px-1.5">
                  <p className="px-2.5 py-1 text-[11px] font-medium text-slate-400">
                    대기 중인 초대 ({pendingInvitations.length})
                  </p>
                  {pendingInvitations.map((inv) => (
                    <PendingInvitationItem
                      key={inv.id}
                      invitation={inv}
                      onAccept={async () => {
                        await acceptInvitation(inv.token);
                        setOpen(false);
                      }}
                      onDecline={() => declineInvitation(inv.token)}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="mx-1.5 my-1 border-t border-slate-100" />

            <div className="px-1.5">
              <button
                onClick={() => {
                  setOpen(false);
                  setShowCreate(true);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>새 워크스페이스</span>
              </button>

              {isTeam && (
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push('/workspace/settings');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>워크스페이스 설정</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateWorkspaceModal onClose={() => setShowCreate(false)} />
      )}
    </>
  );
}

function WorkspaceItem({
  workspace,
  isCurrent,
  onSelect,
}: {
  workspace: Workspace;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const isTeam = workspace.type === 'TEAM';

  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
        isCurrent ? 'bg-primary-50' : 'hover:bg-slate-50'
      }`}
    >
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
        isCurrent ? 'bg-primary-100' : 'bg-slate-100'
      }`}>
        {isTeam ? (
          <Users className={`h-3 w-3 ${isCurrent ? 'text-primary-600' : 'text-slate-500'}`} />
        ) : (
          <FolderOpen className={`h-3 w-3 ${isCurrent ? 'text-primary-600' : 'text-slate-500'}`} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13px] font-medium ${isCurrent ? 'text-primary-700' : 'text-slate-700'}`}>
          {workspace.name}
        </p>
      </div>
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadge[workspace.role]}`}>
        {roleLabel[workspace.role]}
      </span>
      {isCurrent && <Check className="h-3.5 w-3.5 shrink-0 text-primary-600" />}
    </button>
  );
}

function PendingInvitationItem({
  invitation,
  onAccept,
  onDecline,
}: {
  invitation: PendingInvitation;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try { await onAccept(); } catch { /* */ } finally { setLoading(false); }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try { await onDecline(); } catch { /* */ } finally { setLoading(false); }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg px-2.5 py-2">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-50">
        <Mail className="h-3 w-3 text-amber-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-slate-700">{invitation.workspaceName}</p>
        <p className="truncate text-[11px] text-slate-400">{invitation.inviterName}님의 초대</p>
      </div>
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
      ) : (
        <div className="flex gap-1">
          <button
            onClick={handleDecline}
            className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            거절
          </button>
          <button
            onClick={handleAccept}
            className="rounded bg-primary-50 px-1.5 py-0.5 text-[11px] font-medium text-primary-600 transition-colors hover:bg-primary-100"
          >
            수락
          </button>
        </div>
      )}
    </div>
  );
}
