import { ApiResponse, Document, DocumentDetail, UploadResponse, ReportGenerateRequest, ReportGenerateResponse, Report, DiscrepancyDetectRequest, DiscrepancyDetectResponse, DiscrepancyResult, ChunkResponse, BulkChunkResponse, ExcelPreview, Workspace, WorkspaceDetail, WorkspaceInviteResponse, WorkspaceMemberRole, PendingInvitation } from './types';
import { useAuthStore } from '@/stores/authStore';

const BASE_URL = '/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshPromise: Promise<boolean> | null = null;

const WORKSPACE_SKIP_PREFIXES = ['/auth/', '/workspaces', '/invitations/'];

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getWorkspaceHeaders(path: string): Record<string, string> {
  if (WORKSPACE_SKIP_PREFIXES.some((p) => path.startsWith(p))) return {};
  try {
    // lazy require to avoid circular dependency
    const { useWorkspaceStore } = require('@/stores/workspaceStore');
    const ws = useWorkspaceStore.getState().currentWorkspace;
    return ws ? { 'X-Workspace-Id': ws.id } : {};
  } catch {
    return {};
  }
}

async function ensureRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = useAuthStore.getState().refreshTokens();
  }
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function redirectToLogin(): never {
  useAuthStore.getState().clearAuth();
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/login';
  }
  throw new ApiError(401, 'Session expired');
}

async function request<T>(
  path: string,
  options?: RequestInit,
  isRetry = false,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...getWorkspaceHeaders(path),
      ...options?.headers,
    },
  });

  if (res.status === 401 && !isRetry) {
    const ok = await ensureRefresh();
    if (!ok) redirectToLogin();
    return request<T>(path, options, true);
  }

  if (res.status === 403) {
    try {
      const { useWorkspaceStore } = require('@/stores/workspaceStore');
      useWorkspaceStore.getState().fetchWorkspaces();
    } catch {
      // workspace store not available
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      body?.error?.message ?? body?.error ?? `Request failed: ${res.status}`;
    throw new ApiError(res.status, message);
  }

  const body: ApiResponse<T> = await res.json();
  if (!body.success) {
    throw new ApiError(res.status, body.error?.message ?? 'Unknown error');
  }

  return body.data as T;
}

/**
 * URL에 현재 토큰을 붙여 반환하는 함수를 리턴.
 * 호출 시점마다 최신 토큰을 가져오므로 stale token 문제 방지.
 */
function makeAuthenticatedUrlGetter(buildUrl: (id: string) => string) {
  return (id: string) => {
    const baseUrl = buildUrl(id);
    const token = useAuthStore.getState().accessToken;
    if (!token) return baseUrl;
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}token=${token}`;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

// === Documents ===
export const documentsApi = {
  list: () => request<Document[]>('/documents'),

  get: (id: string) => request<DocumentDetail>(`/documents/${id}`),

  upload: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const doUpload = async () => {
      const res = await fetch(`${BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), ...getWorkspaceHeaders('/documents/upload') },
        body: formData,
      });
      return res;
    };

    let res = await doUpload();

    if (res.status === 401) {
      const ok = await ensureRefresh();
      if (!ok) redirectToLogin();
      res = await doUpload();
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message =
        body?.error?.message ?? body?.error ?? 'Upload failed';
      throw new ApiError(res.status, message);
    }

    const body: ApiResponse<UploadResponse> = await res.json();
    if (!body.success) {
      throw new ApiError(res.status, 'Upload failed');
    }
    return body.data as UploadResponse;
  },

  delete: (id: string) =>
    request<void>(`/documents/${id}`, { method: 'DELETE' }),

  getFileUrl: makeAuthenticatedUrlGetter(
    (id) => `${API_URL}/documents/${id}/file`,
  ),

  getPreview: (id: string) => request<ExcelPreview>(`/documents/${id}/preview`),
};

// === Chunks ===
export const chunksApi = {
  get: (documentId: string, chunkIndex: number) =>
    request<ChunkResponse>(`/documents/${documentId}/chunks/${chunkIndex}`),

  getBulk: (documentId: string, indices: number[]) =>
    request<BulkChunkResponse>(
      `/documents/${documentId}/chunks?indices=${indices.join(',')}`,
    ),
};

// === Search ===
export const searchApi = {
  search: (body: import('./types').SearchRequest) =>
    request<import('./types').SearchResult[]>('/search', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// === Chat ===
export const chatApi = {
  history: (sessionId: string) =>
    request<import('./types').ChatHistoryResponse>(
      `/agent/chat/history?sessionId=${sessionId}`,
    ),
};

// === Reports ===
export const reportsApi = {
  generate: (body: ReportGenerateRequest) =>
    request<ReportGenerateResponse>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  list: () => request<Report[]>('/reports'),

  delete: (id: string) =>
    request<void>(`/reports/${id}`, { method: 'DELETE' }),

  downloadUrl: makeAuthenticatedUrlGetter(
    (id) => `${API_URL}/reports/${id}/download`,
  ),
};

// === Discrepancies ===
export const discrepancyApi = {
  detect: (body: DiscrepancyDetectRequest) =>
    request<DiscrepancyDetectResponse>('/discrepancies/detect', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getResult: (id: string) =>
    request<DiscrepancyResult>(`/discrepancies/${id}`),

  getRecent: (triggerType?: string) =>
    request<DiscrepancyResult[]>(
      `/discrepancies/recent${triggerType ? `?triggerType=${triggerType}` : ''}`,
    ),
};

// === Workspaces ===
export const workspacesApi = {
  list: () => request<Workspace[]>('/workspaces'),

  get: (id: string) => request<WorkspaceDetail>(`/workspaces/${id}`),

  create: (body: { name: string; description?: string }) =>
    request<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: { name?: string; description?: string }) =>
    request<void>(`/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<void>(`/workspaces/${id}`, { method: 'DELETE' }),

  invite: (id: string, body: { email: string; role: WorkspaceMemberRole }) =>
    request<WorkspaceInviteResponse>(`/workspaces/${id}/invitations`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  changeMemberRole: (wsId: string, memberId: string, role: WorkspaceMemberRole) =>
    request<void>(`/workspaces/${wsId}/members/${memberId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  removeMember: (wsId: string, memberId: string) =>
    request<void>(`/workspaces/${wsId}/members/${memberId}`, {
      method: 'DELETE',
    }),

  leave: (id: string) =>
    request<void>(`/workspaces/${id}/leave`, { method: 'POST' }),

  getInvitations: (id: string) =>
    request<WorkspaceInviteResponse[]>(`/workspaces/${id}/invitations`),

  cancelInvitation: (wsId: string, invitationId: string) =>
    request<void>(`/workspaces/${wsId}/invitations/${invitationId}`, { method: 'DELETE' }),
};

// === Invitations ===
export const invitationsApi = {
  accept: (token: string) =>
    request<void>(`/invitations/${token}/accept`, { method: 'POST' }),

  decline: (token: string) =>
    request<void>(`/invitations/${token}/decline`, { method: 'POST' }),

  pending: () => request<PendingInvitation[]>('/invitations/pending'),
};
