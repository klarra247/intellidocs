'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Users, ChevronDown, Check, Plus, Settings, Mail, Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Workspace, PendingInvitation } from '@/lib/types';
import CreateWorkspaceModal from './CreateWorkspaceModal';

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
          className="flex w-full items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-left transition-colors"
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px]"
            style={{ background: 'var(--accent-light)' }}
          >
            {isTeam ? (
              <Users className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} strokeWidth={2.5} />
            ) : (
              <FolderOpen className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} strokeWidth={2.5} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {currentWorkspace.name}
            </p>
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-tertiary)' }}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className="absolute left-0 right-0 top-full z-50 mt-1 animate-scale-in rounded-[8px] py-1.5"
            style={{
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
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
                <div className="mx-1.5 my-1" style={{ borderTop: '1px solid var(--border)' }} />
                <div className="px-1.5">
                  <p className="px-2 py-1 text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
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

            <div className="mx-1.5 my-1" style={{ borderTop: '1px solid var(--border)' }} />

            <div className="px-1.5">
              <button
                onClick={() => {
                  setOpen(false);
                  setShowCreate(true);
                }}
                className="flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-[13px] transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
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
                  className="flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-[13px] transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
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
      className="flex w-full items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-left transition-colors"
      style={{ background: isCurrent ? 'var(--bg-active)' : 'transparent' }}
      onMouseEnter={(e) => {
        if (!isCurrent) e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!isCurrent) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px]"
        style={{ background: isCurrent ? 'var(--accent-light)' : 'var(--bg-secondary)' }}
      >
        {isTeam ? (
          <Users className="h-3 w-3" style={{ color: isCurrent ? 'var(--accent)' : 'var(--text-tertiary)' }} />
        ) : (
          <FolderOpen className="h-3 w-3" style={{ color: isCurrent ? 'var(--accent)' : 'var(--text-tertiary)' }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[13px]"
          style={{
            color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: isCurrent ? 500 : 400,
          }}
        >
          {workspace.name}
        </p>
      </div>
      {isCurrent && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent)' }} />}
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
    <div className="flex items-center gap-2 rounded-[4px] px-2 py-1.5">
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px]"
        style={{ background: '#fef3c7' }}
      >
        <Mail className="h-3 w-3" style={{ color: 'var(--warning)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {invitation.workspaceName}
        </p>
        <p className="truncate text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          {invitation.inviterName}님의 초대
        </p>
      </div>
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
      ) : (
        <div className="flex gap-1">
          <button
            onClick={handleDecline}
            className="rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            거절
          </button>
          <button
            onClick={handleAccept}
            className="rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium transition-colors"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            수락
          </button>
        </div>
      )}
    </div>
  );
}
