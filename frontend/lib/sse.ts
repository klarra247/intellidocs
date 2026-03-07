import { DocumentStatusEvent, ReportStatusEvent, DiscrepancyStatusEvent } from './types';
import { useAuthStore } from '@/stores/authStore';

/**
 * SSE/스트리밍 연결은 Next.js rewrites 프록시를 우회하여 백엔드에 직접 연결.
 * Next.js의 http-proxy는 장시간 열려있는 SSE 연결을 제대로 중계하지 못하고
 * 응답을 버퍼링하거나 socket hang up(ECONNRESET)을 발생시킴.
 */
const SSE_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

interface SSEOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

function getAuthToken(): string | null {
  return useAuthStore.getState().accessToken;
}

function appendToken(url: string): string {
  const token = getAuthToken();
  if (!token) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${token}`;
}

/**
 * SSE client for document status updates with auto-reconnect.
 * Returns a cleanup function to close the connection.
 */
export function subscribeDocumentStatus(
  documentId: string,
  onEvent: (event: DocumentStatusEvent) => void,
  onError?: (error: string) => void,
  options: SSEOptions = {},
): () => void {
  const { maxRetries = 3, retryDelay = 2000, timeout = 120_000 } = options;

  let eventSource: EventSource | null = null;
  let retryCount = 0;
  let timeoutId: ReturnType<typeof setTimeout>;
  let closed = false;

  function connect() {
    if (closed) return;

    const url = appendToken(`${SSE_BASE_URL}/documents/${documentId}/status`);
    eventSource = new EventSource(url);

    // Reset timeout on each connect
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      onError?.('연결 시간이 초과되었습니다');
      cleanup();
    }, timeout);

    // Backend sends named "status" events via SseEmitter.event().name("status").
    // Named SSE events require addEventListener, not onmessage (which only catches unnamed events).
    eventSource.addEventListener('status', (e: MessageEvent) => {
      retryCount = 0; // reset on successful message
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        cleanup();
      }, timeout);

      try {
        const data: DocumentStatusEvent = JSON.parse(e.data);
        onEvent(data);

        // Auto-close on terminal states
        if (data.status === 'INDEXED' || data.status === 'FAILED') {
          cleanup();
        }
      } catch {
        // ignore malformed messages
      }
    });

    eventSource.onerror = () => {
      eventSource?.close();
      eventSource = null;

      if (closed) return;

      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(connect, retryDelay * retryCount);
      } else {
        onError?.('SSE 연결에 실패했습니다');
        cleanup();
      }
    };
  }

  function cleanup() {
    closed = true;
    clearTimeout(timeoutId);
    eventSource?.close();
    eventSource = null;
  }

  connect();
  return cleanup;
}

/**
 * SSE client for chat streaming via POST + ReadableStream.
 * 401 발생 시 토큰 갱신 후 1회 재시도.
 */
export async function streamChat(
  body: { question: string; sessionId?: string; documentIds?: string[] },
  onEvent: (eventName: string, data: Record<string, unknown>) => void,
  signal?: AbortSignal,
): Promise<void> {
  const doFetch = () => {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return fetch(`${SSE_BASE_URL}/agent/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  };

  let res = await doFetch();

  if (res.status === 401) {
    const ok = await useAuthStore.getState().refreshTokens();
    if (!ok) {
      useAuthStore.getState().clearAuth();
      throw new Error('Session expired');
    }
    res = await doFetch();
  }

  if (!res.ok || !res.body) {
    throw new Error(`Stream request failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        const jsonStr = line.slice(5).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        try {
          const data = JSON.parse(jsonStr);
          onEvent(currentEvent || 'message', data);
        } catch {
          // ignore malformed events
        }
        currentEvent = '';
      }
    }
  }
}

/**
 * SSE client for report generation status updates.
 * Same pattern as subscribeDocumentStatus.
 */
export function subscribeReportStatus(
  reportId: string,
  onEvent: (event: ReportStatusEvent) => void,
  onError?: (error: string) => void,
  options: SSEOptions = {},
): () => void {
  const { maxRetries = 3, retryDelay = 2000, timeout = 300_000 } = options;

  let eventSource: EventSource | null = null;
  let retryCount = 0;
  let timeoutId: ReturnType<typeof setTimeout>;
  let closed = false;

  function connect() {
    if (closed) return;

    const url = appendToken(`${SSE_BASE_URL}/reports/${reportId}/status`);
    eventSource = new EventSource(url);

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      onError?.('연결 시간이 초과되었습니다');
      cleanup();
    }, timeout);

    eventSource.addEventListener('status', (e: MessageEvent) => {
      retryCount = 0;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        cleanup();
      }, timeout);

      try {
        const data: ReportStatusEvent = JSON.parse(e.data);
        onEvent(data);

        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          cleanup();
        }
      } catch {
        // ignore malformed messages
      }
    });

    eventSource.onerror = () => {
      eventSource?.close();
      eventSource = null;

      if (closed) return;

      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(connect, retryDelay * retryCount);
      } else {
        onError?.('SSE 연결에 실패했습니다');
        cleanup();
      }
    };
  }

  function cleanup() {
    closed = true;
    clearTimeout(timeoutId);
    eventSource?.close();
    eventSource = null;
  }

  connect();
  return cleanup;
}

/**
 * SSE client for discrepancy detection status updates.
 */
export function subscribeDiscrepancyStatus(
  jobId: string,
  onEvent: (event: DiscrepancyStatusEvent) => void,
  onError?: (error: string) => void,
  options: SSEOptions = {},
): () => void {
  const { maxRetries = 3, retryDelay = 2000, timeout = 120_000 } = options;

  let eventSource: EventSource | null = null;
  let retryCount = 0;
  let timeoutId: ReturnType<typeof setTimeout>;
  let closed = false;

  function connect() {
    if (closed) return;

    const url = appendToken(`${SSE_BASE_URL}/discrepancies/${jobId}/status`);
    eventSource = new EventSource(url);

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      onError?.('연결 시간이 초과되었습니다');
      cleanup();
    }, timeout);

    eventSource.addEventListener('status', (e: MessageEvent) => {
      retryCount = 0;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        cleanup();
      }, timeout);

      try {
        const data: DiscrepancyStatusEvent = JSON.parse(e.data);
        onEvent(data);

        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          cleanup();
        }
      } catch {
        // ignore malformed messages
      }
    });

    eventSource.onerror = () => {
      eventSource?.close();
      eventSource = null;

      if (closed) return;

      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(connect, retryDelay * retryCount);
      } else {
        onError?.('SSE 연결에 실패했습니다');
        cleanup();
      }
    };
  }

  function cleanup() {
    closed = true;
    clearTimeout(timeoutId);
    eventSource?.close();
    eventSource = null;
  }

  connect();
  return cleanup;
}
