import { create } from 'zustand';
import { Document, DocumentStatus, ReviewStatus } from '@/lib/types';
import { documentsApi, documentReviewApi } from '@/lib/api';
import { subscribeDocumentStatus } from '@/lib/sse';

export interface UploadingFile {
  id: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'done' | 'error';
  message: string;
  documentId?: string;
}

interface DocumentState {
  documents: Document[];
  uploadingFiles: Map<string, UploadingFile>;
  loading: boolean;
  error: string | null;
  pendingDeleteId: string | null;

  fetchDocuments: () => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
  updateDocumentStatus: (id: string, status: DocumentStatus) => void;
  deleteDocument: (id: string) => Promise<void>;
  setPendingDelete: (id: string | null) => void;
  clearError: () => void;
  requestReview: (documentId: string) => Promise<void>;
  submitReview: (documentId: string, status: ReviewStatus) => Promise<void>;
}

// Track SSE cleanups outside of state to avoid re-renders
const sseCleanups = new Map<string, () => void>();

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  uploadingFiles: new Map(),
  loading: false,
  error: null,
  pendingDeleteId: null,

  fetchDocuments: async () => {
    set({ loading: true, error: null });
    try {
      const documents = await documentsApi.list();
      set({ documents, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  uploadDocument: async (file: File) => {
    const tempId = crypto.randomUUID();
    const uploadFile: UploadingFile = {
      id: tempId,
      filename: file.name,
      progress: 0,
      status: 'uploading',
      message: '업로드 중...',
    };

    set((state) => {
      const next = new Map(state.uploadingFiles);
      next.set(tempId, uploadFile);
      return { uploadingFiles: next };
    });

    try {
      // Upload returns UploadResponse with `documentId` (not `id`)
      const uploadRes = await documentsApi.upload(file);
      const documentId = uploadRes.documentId;

      // Update uploading entry with real document ID
      set((state) => {
        const next = new Map(state.uploadingFiles);
        const entry = next.get(tempId);
        if (entry) {
          next.set(tempId, {
            ...entry,
            documentId,
            status: 'processing',
            progress: 10,
            message: '처리 대기 중...',
          });
        }
        return { uploadingFiles: next };
      });

      // Refresh the full document list to get ListResponse data
      get().fetchDocuments();

      // Subscribe to SSE for processing updates
      const cleanup = subscribeDocumentStatus(
        documentId,
        (event) => {
          const statusToProgress: Record<string, number> = {
            UPLOADING: 10,
            PARSING: 50,
            PARSED: 65,
            INDEXING: 80,
            INDEXED: 100,
            FAILED: 0,
          };

          const isDone = event.status === 'INDEXED';
          const isFailed = event.status === 'FAILED';

          set((state) => {
            // Update uploading file progress
            const nextUploading = new Map(state.uploadingFiles);
            const entry = nextUploading.get(tempId);
            if (entry) {
              nextUploading.set(tempId, {
                ...entry,
                progress: statusToProgress[event.status] ?? entry.progress,
                status: isFailed ? 'error' : isDone ? 'done' : 'processing',
                message: event.message,
              });
            }

            // Update document status in the list
            const nextDocs = state.documents.map((d) =>
              d.id === documentId ? { ...d, status: event.status } : d,
            );

            return { uploadingFiles: nextUploading, documents: nextDocs };
          });

          // Auto-remove completed upload entry after delay
          if (isDone) {
            sseCleanups.delete(tempId);

            // Notify KG extraction started
            try {
              const { useChatStore } = require('@/stores/chatStore');
              useChatStore.getState().showToast(
                '📊 Knowledge Graph 엔티티 추출이 시작되었습니다',
                'success'
              );
            } catch { /* chat store not available */ }

            setTimeout(() => {
              set((state) => {
                const next = new Map(state.uploadingFiles);
                next.delete(tempId);
                return { uploadingFiles: next };
              });
            }, 3000);
          }
        },
        (errorMsg) => {
          set((state) => {
            const next = new Map(state.uploadingFiles);
            const entry = next.get(tempId);
            if (entry) {
              next.set(tempId, {
                ...entry,
                status: 'error',
                message: errorMsg,
              });
            }
            return { uploadingFiles: next };
          });
        },
      );

      sseCleanups.set(tempId, cleanup);
    } catch (e) {
      set((state) => {
        const next = new Map(state.uploadingFiles);
        const entry = next.get(tempId);
        if (entry) {
          next.set(tempId, {
            ...entry,
            status: 'error',
            message: (e as Error).message,
          });
        }
        return { uploadingFiles: next };
      });
    }
  },

  updateDocumentStatus: (id, status) => {
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, status } : d,
      ),
    }));
  },

  deleteDocument: async (id: string) => {
    try {
      await documentsApi.delete(id);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
        pendingDeleteId: null,
      }));
    } catch (e) {
      set({ error: (e as Error).message, pendingDeleteId: null });
    }
  },

  setPendingDelete: (id) => {
    set({ pendingDeleteId: id });
  },

  clearError: () => {
    set({ error: null });
  },

  requestReview: async (documentId: string) => {
    try {
      const result = await documentReviewApi.requestReview(documentId);
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === documentId ? { ...d, reviewStatus: result.reviewStatus } : d,
        ),
      }));
      // Also update viewerStore documentDetail
      try {
        const { useViewerStore } = require('@/stores/viewerStore');
        const vs = useViewerStore.getState();
        if (vs.documentId === documentId && vs.documentDetail) {
          useViewerStore.setState({
            documentDetail: { ...vs.documentDetail, reviewStatus: result.reviewStatus },
          });
        }
      } catch { /* viewer store not available */ }
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  submitReview: async (documentId: string, status: ReviewStatus) => {
    try {
      const result = await documentReviewApi.submitReview(documentId, status);
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === documentId ? { ...d, reviewStatus: result.reviewStatus } : d,
        ),
      }));
      try {
        const { useViewerStore } = require('@/stores/viewerStore');
        const vs = useViewerStore.getState();
        if (vs.documentId === documentId && vs.documentDetail) {
          useViewerStore.setState({
            documentDetail: { ...vs.documentDetail, reviewStatus: result.reviewStatus },
          });
        }
      } catch { /* viewer store not available */ }
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));
