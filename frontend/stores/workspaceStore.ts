import { create } from 'zustand';
import { Workspace, WorkspaceDetail, WorkspaceMemberRole, PendingInvitation } from '@/lib/types';
import { workspacesApi, invitationsApi } from '@/lib/api';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  workspaceDetail: WorkspaceDetail | null;
  pendingInvitations: PendingInvitation[];
  loading: boolean;
  error: string | null;
  initialized: boolean;

  fetchWorkspaces: () => Promise<void>;
  switchWorkspace: (id: string) => void;
  createWorkspace: (name: string, description?: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  fetchWorkspaceDetail: (id: string) => Promise<void>;
  updateWorkspace: (id: string, data: { name?: string; description?: string }) => Promise<void>;
  inviteMember: (wsId: string, email: string, role: WorkspaceMemberRole) => Promise<import('@/lib/types').WorkspaceInviteResponse>;
  changeMemberRole: (wsId: string, memberId: string, role: WorkspaceMemberRole) => Promise<void>;
  removeMember: (wsId: string, memberId: string) => Promise<void>;
  leaveWorkspace: (wsId: string) => Promise<void>;
  acceptInvitation: (token: string) => Promise<void>;
  declineInvitation: (token: string) => Promise<void>;
  clearError: () => void;
}

function refreshDependentStores() {
  try {
    const { useDocumentStore } = require('@/stores/documentStore');
    useDocumentStore.getState().fetchDocuments();
  } catch { /* not available */ }
  try {
    const { useChatStore } = require('@/stores/chatStore');
    useChatStore.getState().clearChat();
  } catch { /* not available */ }
  try {
    const { useReportStore } = require('@/stores/reportStore');
    useReportStore.getState().fetchReports();
  } catch { /* not available */ }
  try {
    const { useDiscrepancyStore } = require('@/stores/discrepancyStore');
    useDiscrepancyStore.getState().fetchRecent();
  } catch { /* not available */ }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  workspaceDetail: null,
  pendingInvitations: [],
  loading: false,
  error: null,
  initialized: false,

  fetchWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const [workspaces, pending] = await Promise.all([
        workspacesApi.list(),
        invitationsApi.pending().catch(() => [] as PendingInvitation[]),
      ]);
      const savedId = localStorage.getItem('selectedWorkspaceId');
      let current = workspaces.find((w) => w.id === savedId) ?? null;
      if (!current) {
        current = workspaces.find((w) => w.type === 'PERSONAL') ?? workspaces[0] ?? null;
      }
      if (current) {
        localStorage.setItem('selectedWorkspaceId', current.id);
      }
      set({ workspaces, pendingInvitations: pending, currentWorkspace: current, loading: false, initialized: true });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '워크스페이스 목록을 불러올 수 없습니다',
        loading: false,
        initialized: true,
      });
    }
  },

  switchWorkspace: (id) => {
    const { workspaces, currentWorkspace } = get();
    if (currentWorkspace?.id === id) return;
    const ws = workspaces.find((w) => w.id === id);
    if (!ws) return;
    localStorage.setItem('selectedWorkspaceId', ws.id);
    set({ currentWorkspace: ws, workspaceDetail: null });
    try {
      const { useViewerStore } = require('@/stores/viewerStore');
      useViewerStore.getState().closeViewer();
    } catch { /* viewer store not available */ }
    refreshDependentStores();
  },

  createWorkspace: async (name, description) => {
    await workspacesApi.create({ name, description });
    const workspaces = await workspacesApi.list();
    const created = workspaces.find((w) => w.name === name && w.type === 'TEAM');
    set({ workspaces });
    if (created) {
      get().switchWorkspace(created.id);
    }
  },

  deleteWorkspace: async (id) => {
    await workspacesApi.delete(id);
    await get().fetchWorkspaces();
    const { workspaces } = get();
    const personal = workspaces.find((w) => w.type === 'PERSONAL');
    if (personal) {
      get().switchWorkspace(personal.id);
    }
  },

  fetchWorkspaceDetail: async (id) => {
    try {
      const detail = await workspacesApi.get(id);
      set({ workspaceDetail: detail });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '워크스페이스 정보를 불러올 수 없습니다' });
    }
  },

  updateWorkspace: async (id, data) => {
    await workspacesApi.update(id, data);
    await get().fetchWorkspaceDetail(id);
    // Update workspace name in list too
    const { workspaces, currentWorkspace } = get();
    if (data.name) {
      set({
        workspaces: workspaces.map((w) =>
          w.id === id ? { ...w, name: data.name!, description: data.description ?? w.description } : w,
        ),
        currentWorkspace: currentWorkspace?.id === id
          ? { ...currentWorkspace, name: data.name, description: data.description ?? currentWorkspace.description }
          : currentWorkspace,
      });
    }
  },

  inviteMember: async (wsId, email, role) => {
    const result = await workspacesApi.invite(wsId, { email, role });
    await get().fetchWorkspaceDetail(wsId);
    return result;
  },

  changeMemberRole: async (wsId, memberId, role) => {
    await workspacesApi.changeMemberRole(wsId, memberId, role);
    await get().fetchWorkspaceDetail(wsId);
  },

  removeMember: async (wsId, memberId) => {
    await workspacesApi.removeMember(wsId, memberId);
    await get().fetchWorkspaceDetail(wsId);
  },

  leaveWorkspace: async (wsId) => {
    await workspacesApi.leave(wsId);
    await get().fetchWorkspaces();
    const { workspaces } = get();
    const personal = workspaces.find((w) => w.type === 'PERSONAL');
    if (personal) {
      get().switchWorkspace(personal.id);
    }
  },

  acceptInvitation: async (token) => {
    await invitationsApi.accept(token);
    set({ pendingInvitations: get().pendingInvitations.filter((i) => i.token !== token) });
    await get().fetchWorkspaces();
  },

  declineInvitation: async (token) => {
    await invitationsApi.decline(token);
    set({ pendingInvitations: get().pendingInvitations.filter((i) => i.token !== token) });
  },

  clearError: () => set({ error: null }),
}));
