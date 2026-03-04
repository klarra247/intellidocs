import { ApiResponse, Document, DocumentDetail, UploadResponse, ReportGenerateRequest, ReportGenerateResponse, Report, DiscrepancyDetectRequest, DiscrepancyDetectResponse, DiscrepancyResult } from './types';

const BASE_URL = '/api/v1';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

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

// === Documents ===
export const documentsApi = {
  list: () => request<Document[]>('/documents'),

  get: (id: string) => request<DocumentDetail>(`/documents/${id}`),

  upload: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

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

  downloadUrl: (id: string) => {
    const sseBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
    return `${sseBase}/reports/${id}/download`;
  },
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
