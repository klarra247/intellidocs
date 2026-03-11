import { create } from 'zustand';
import { DocumentVersion, DiffDetailResponse } from '@/lib/types';
import { versionsApi, diffApi } from '@/lib/api';
import { subscribeDiffStatus, subscribeDocumentStatus } from '@/lib/sse';

interface DiffJob {
  id: string;
  status: string;
  message: string;
  progress: number;
}

interface VersionState {
  versions: DocumentVersion[];
  loading: boolean;
  error: string | null;
  currentDiff: DiffDetailResponse | null;
  diffLoading: boolean;
  diffJob: DiffJob | null;
  uploading: boolean;

  fetchVersions: (documentId: string) => Promise<void>;
  uploadNewVersion: (documentId: string, file: File) => Promise<void>;
  fetchDiff: (diffId: string) => Promise<void>;
  requestDiff: (sourceId: string, targetId: string) => Promise<void>;
  clearDiff: () => void;
  reset: () => void;
}

let sseCleanup: (() => void) | null = null;
let uploadSseCleanup: (() => void) | null = null;

// Track the documentId for auto-refresh after upload
let _pendingRefreshDocId: string | null = null;

export const useVersionStore = create<VersionState>((set, get) => ({
  versions: [],
  loading: false,
  error: null,
  currentDiff: null,
  diffLoading: false,
  diffJob: null,
  uploading: false,

  fetchVersions: async (documentId) => {
    set({ loading: true, error: null });
    try {
      const versions = await versionsApi.list(documentId);
      set({ versions, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  uploadNewVersion: async (documentId, file) => {
    uploadSseCleanup?.();
    uploadSseCleanup = null;

    set({ uploading: true, error: null });
    try {
      const res = await versionsApi.upload(documentId, file);
      _pendingRefreshDocId = documentId;

      // Subscribe to document status SSE for the new version
      uploadSseCleanup = subscribeDocumentStatus(
        res.documentId,
        (event) => {
          if (event.status === 'INDEXED' || event.status === 'FAILED') {
            uploadSseCleanup = null;
            set({ uploading: false });
            if (event.status === 'INDEXED' && _pendingRefreshDocId) {
              const docId = _pendingRefreshDocId;
              _pendingRefreshDocId = null;
              // Refresh document list in sidebar
              try {
                const { useDocumentStore } = require('@/stores/documentStore');
                useDocumentStore.getState().fetchDocuments();
              } catch { /* ignore */ }
              // Refresh versions, then auto-start diff with previous version
              get().fetchVersions(docId).then(() => {
                const versions = get().versions;
                const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
                if (sorted.length >= 2) {
                  const latest = sorted[0];
                  const previous = sorted[1];
                  if (latest.status === 'INDEXED' && previous.status === 'INDEXED') {
                    get().requestDiff(previous.documentId, latest.documentId);
                  }
                }
              });
            }
          }
        },
        () => {
          set({ uploading: false });
        },
      );
    } catch (e) {
      set({ error: (e as Error).message, uploading: false });
    }
  },

  fetchDiff: async (diffId) => {
    set({ diffLoading: true });
    try {
      const result = await diffApi.getResult(diffId);
      set({ currentDiff: result, diffLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, diffLoading: false });
    }
  },

  requestDiff: async (sourceId, targetId) => {
    sseCleanup?.();
    sseCleanup = null;

    try {
      const res = await diffApi.create({
        sourceDocumentId: sourceId,
        targetDocumentId: targetId,
      });
      const diffId = res.diffId;

      set({
        diffJob: {
          id: diffId,
          status: 'PENDING',
          message: '비교 분석 대기 중...',
          progress: 0,
        },
        error: null,
      });

      sseCleanup = subscribeDiffStatus(
        diffId,
        (event) => {
          set({
            diffJob: {
              id: diffId,
              status: event.status,
              message: event.message,
              progress: event.progress,
            },
          });

          if (event.status === 'COMPLETED' || event.status === 'FAILED') {
            sseCleanup = null;

            if (event.status === 'COMPLETED') {
              diffApi.getResult(diffId).then((result) => {
                set({ currentDiff: result, diffJob: null });
              });
              // Refresh version list to update diffStatus/diffId
              get().fetchVersions(sourceId);
            } else {
              setTimeout(() => {
                set({ diffJob: null });
                // Refresh version list to show FAILED status
                get().fetchVersions(sourceId);
              }, 5000);
            }
          }
        },
        (errorMsg) => {
          set({
            diffJob: {
              id: '',
              status: 'FAILED',
              message: errorMsg,
              progress: 0,
            },
          });
          setTimeout(() => {
            set({ diffJob: null });
          }, 5000);
        },
      );
    } catch (e) {
      set({ error: (e as Error).message, diffJob: null });
    }
  },

  clearDiff: () => set({ currentDiff: null }),

  reset: () => {
    sseCleanup?.();
    sseCleanup = null;
    uploadSseCleanup?.();
    uploadSseCleanup = null;
    set({
      versions: [],
      loading: false,
      error: null,
      currentDiff: null,
      diffLoading: false,
      diffJob: null,
      uploading: false,
    });
  },
}));
