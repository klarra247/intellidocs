'use client';

import { useState, useEffect } from 'react';
import { UserMinus, Loader2, X, Clock } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuthStore } from '@/stores/authStore';
import { WorkspaceMember, WorkspaceMemberRole, WorkspaceInviteResponse } from '@/lib/types';
import { workspacesApi } from '@/lib/api';
import InviteMemberModal from './InviteMemberModal';

const roleBadgeStyles: Record<string, { backgroundColor: string; color: string }> = {
  OWNER: { backgroundColor: '#f3e8ff', color: '#7c3aed' },
  ADMIN: { backgroundColor: 'var(--accent-light)', color: 'var(--accent)' },
  MEMBER: { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' },
};

const roleLabel: Record<string, string> = {
  OWNER: '소유자',
  ADMIN: '관리자',
  MEMBER: '멤버',
};

export default function MembersTab() {
  const { workspaceDetail, currentWorkspace, changeMemberRole, removeMember } = useWorkspaceStore();
  const currentUser = useAuthStore((s) => s.user);
  const [showInvite, setShowInvite] = useState(false);
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<WorkspaceInviteResponse[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [inviteBtnHover, setInviteBtnHover] = useState(false);
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [hoveredRemoveId, setHoveredRemoveId] = useState<string | null>(null);
  const [hoveredInviteId, setHoveredInviteId] = useState<string | null>(null);
  const [hoveredCancelId, setHoveredCancelId] = useState<string | null>(null);

  const myRole = workspaceDetail?.myRole;
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';

  useEffect(() => {
    if (!currentWorkspace || !canManage) return;
    workspacesApi.getInvitations(currentWorkspace.id)
      .then(setPendingInvites)
      .catch(() => {});
  }, [currentWorkspace, canManage]);

  const handleCancelInvite = async (invitationId: string) => {
    if (!currentWorkspace) return;
    setCancellingId(invitationId);
    try {
      await workspacesApi.cancelInvitation(currentWorkspace.id, invitationId);
      setPendingInvites((prev) => prev.filter((i) => i.invitationId !== invitationId));
    } catch { /* */ }
    finally { setCancellingId(null); }
  };

  if (!workspaceDetail || !currentWorkspace) {
    return (
      <div className="flex justify-center py-8">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
        />
      </div>
    );
  }

  const handleRoleChange = async (memberId: string, role: WorkspaceMemberRole) => {
    setLoadingMemberId(memberId);
    try {
      await changeMemberRole(currentWorkspace.id, memberId, role);
    } catch {
      // handled by store error
    } finally {
      setLoadingMemberId(null);
    }
  };

  const handleRemove = async (member: WorkspaceMember) => {
    if (!confirm(`${member.name}님을 워크스페이스에서 제거하시겠습니까?`)) return;
    setLoadingMemberId(member.userId);
    try {
      await removeMember(currentWorkspace.id, member.userId);
    } catch {
      // handled by store error
    } finally {
      setLoadingMemberId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {workspaceDetail.members.length}명의 멤버
        </p>
        {canManage && (
          <button
            onClick={() => setShowInvite(true)}
            className="rounded-[8px] px-3.5 py-2 text-[13px] font-semibold transition-colors"
            style={{
              backgroundColor: inviteBtnHover ? 'var(--accent-hover)' : 'var(--accent)',
              color: '#ffffff',
            }}
            onMouseEnter={() => setInviteBtnHover(true)}
            onMouseLeave={() => setInviteBtnHover(false)}
          >
            멤버 초대
          </button>
        )}
      </div>

      <div className="mt-4 space-y-1">
        {workspaceDetail.members.map((member) => {
          const isMe = member.userId === currentUser?.id;
          const isOwner = member.role === 'OWNER';
          const canModify = canManage && !isMe && !isOwner;
          const isLoading = loadingMemberId === member.userId;
          const isHovered = hoveredMemberId === member.userId;
          const isRemoveHovered = hoveredRemoveId === member.userId;

          return (
            <div
              key={member.userId}
              className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 transition-colors"
              style={{ backgroundColor: isHovered ? 'var(--bg-hover)' : 'transparent' }}
              onMouseEnter={() => setHoveredMemberId(member.userId)}
              onMouseLeave={() => setHoveredMemberId(null)}
            >
              {/* Avatar */}
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-medium"
                style={{
                  backgroundColor: 'var(--bg-active)',
                  color: 'var(--text-secondary)',
                }}
              >
                {member.profileImageUrl ? (
                  <img
                    src={member.profileImageUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  member.name.charAt(0).toUpperCase()
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[13px] font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {member.name}
                  {isMe && (
                    <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>(나)</span>
                  )}
                </p>
                <p
                  className="truncate text-[12px]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {member.email}
                </p>
              </div>

              {/* Role */}
              {canModify ? (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.userId, e.target.value as WorkspaceMemberRole)}
                  disabled={isLoading}
                  className="rounded-[8px] px-2 py-1 text-[12px] font-medium focus:outline-none"
                  style={{
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="ADMIN">관리자</option>
                  <option value="MEMBER">멤버</option>
                </select>
              ) : (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={roleBadgeStyles[member.role]}
                >
                  {roleLabel[member.role]}
                </span>
              )}

              {/* Remove */}
              {canModify && (
                <button
                  onClick={() => handleRemove(member)}
                  disabled={isLoading}
                  className="rounded-[8px] p-1.5 transition-colors disabled:opacity-50"
                  style={{
                    color: isRemoveHovered ? 'var(--error)' : 'var(--text-tertiary)',
                    backgroundColor: isRemoveHovered ? '#fef2f2' : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredRemoveId(member.userId)}
                  onMouseLeave={() => setHoveredRemoveId(null)}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserMinus className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Pending invitations */}
      {canManage && pendingInvites.length > 0 && (
        <div className="mt-6">
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
            대기 중인 초대
          </p>
          <div className="mt-2 space-y-1">
            {pendingInvites.map((inv) => {
              const isExpired = inv.status === 'EXPIRED' || new Date(inv.expiresAt) < new Date();
              const isInvHovered = hoveredInviteId === inv.invitationId;
              const isCancelHovered = hoveredCancelId === inv.invitationId;
              return (
                <div
                  key={inv.invitationId}
                  className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 transition-colors"
                  style={{
                    opacity: isExpired ? 0.5 : 1,
                    backgroundColor: !isExpired && isInvHovered ? 'var(--bg-hover)' : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredInviteId(inv.invitationId)}
                  onMouseLeave={() => setHoveredInviteId(null)}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: '#fffbeb' }}
                  >
                    <Clock className="h-3.5 w-3.5" style={{ color: 'var(--warning)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[13px] font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {inv.email}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      {isExpired ? '만료됨' : `${new Date(inv.expiresAt).toLocaleDateString('ko-KR')}까지`}
                    </p>
                  </div>
                  {isExpired ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      만료
                    </span>
                  ) : (
                    <button
                      onClick={() => handleCancelInvite(inv.invitationId)}
                      disabled={cancellingId === inv.invitationId}
                      className="rounded-[8px] p-1.5 transition-colors disabled:opacity-50"
                      style={{
                        color: isCancelHovered ? 'var(--error)' : 'var(--text-tertiary)',
                        backgroundColor: isCancelHovered ? '#fef2f2' : 'transparent',
                      }}
                      onMouseEnter={() => setHoveredCancelId(inv.invitationId)}
                      onMouseLeave={() => setHoveredCancelId(null)}
                    >
                      {cancellingId === inv.invitationId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showInvite && (
        <InviteMemberModal
          onClose={() => setShowInvite(false)}
          onInvited={() => {
            if (currentWorkspace) {
              workspacesApi.getInvitations(currentWorkspace.id)
                .then(setPendingInvites)
                .catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}
