import { create } from 'zustand';
import { DocumentCommentResponse } from '@/lib/types';
import { documentCommentsApi } from '@/lib/api';
import { useChatStore } from '@/stores/chatStore';

type CommentFilter = 'all' | 'unresolved';

interface PendingLocation {
  chunkIndex?: number;
  pageNumber?: number;
}

interface DocumentCommentState {
  documentId: string | null;
  comments: DocumentCommentResponse[];
  totalCount: number;
  unresolvedCount: number;
  loading: boolean;
  filter: CommentFilter;
  pendingLocation: PendingLocation | null;

  openPanel: (documentId: string) => void;
  closePanel: () => void;
  setFilter: (filter: CommentFilter) => void;
  loadComments: () => Promise<void>;
  createComment: (content: string, chunkIndex?: number, pageNumber?: number) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  resolveComment: (commentId: string) => Promise<void>;
  unresolveComment: (commentId: string) => Promise<void>;
  setPendingLocation: (chunkIndex?: number, pageNumber?: number) => void;
  clearPendingLocation: () => void;
}

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  try {
    useChatStore.getState().showToast(message, type);
  } catch {
    // chat store not available
  }
};

export const useDocumentCommentStore = create<DocumentCommentState>((set, get) => ({
  documentId: null,
  comments: [],
  totalCount: 0,
  unresolvedCount: 0,
  loading: false,
  filter: 'all',
  pendingLocation: null,

  openPanel: (documentId) => {
    const current = get().documentId;
    set({ documentId, filter: 'all' });
    if (current !== documentId) {
      set({ comments: [], totalCount: 0, unresolvedCount: 0 });
      get().loadComments();
    }
  },

  closePanel: () => {
    set({ documentId: null, comments: [], totalCount: 0, unresolvedCount: 0, loading: false, filter: 'all', pendingLocation: null });
  },

  setFilter: (filter) => {
    set({ filter });
    get().loadComments();
  },

  loadComments: async () => {
    const { documentId, filter } = get();
    if (!documentId) return;

    set({ loading: true });
    try {
      const resolved = filter === 'unresolved' ? false : undefined;
      const result = await documentCommentsApi.list(documentId, resolved);
      set({
        comments: result.comments,
        totalCount: result.totalCount,
        unresolvedCount: result.unresolvedCount,
        loading: false,
      });
    } catch (e) {
      set({ loading: false });
      showToast((e as Error).message, 'error');
    }
  },

  createComment: async (content, chunkIndex, pageNumber) => {
    const { documentId, totalCount } = get();
    if (!documentId) return;

    if (totalCount >= 100) {
      showToast('문서당 최대 100개의 코멘트만 작성할 수 있습니다', 'error');
      return;
    }

    try {
      await documentCommentsApi.create(documentId, { content, chunkIndex, pageNumber });
      set({ pendingLocation: null });
      await get().loadComments();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  },

  updateComment: async (commentId, content) => {
    const { documentId } = get();
    if (!documentId) return;

    try {
      const updated = await documentCommentsApi.update(documentId, commentId, content);
      set((state) => ({
        comments: state.comments.map((c) => (c.id === commentId ? updated : c)),
      }));
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  },

  deleteComment: async (commentId) => {
    const { documentId } = get();
    if (!documentId) return;

    try {
      await documentCommentsApi.delete(documentId, commentId);
      await get().loadComments();
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  },

  resolveComment: async (commentId) => {
    const { documentId } = get();
    if (!documentId) return;

    try {
      const updated = await documentCommentsApi.resolve(documentId, commentId);
      set((state) => ({
        comments: state.comments.map((c) => (c.id === commentId ? updated : c)),
        unresolvedCount: state.unresolvedCount - 1,
      }));
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  },

  unresolveComment: async (commentId) => {
    const { documentId } = get();
    if (!documentId) return;

    try {
      const updated = await documentCommentsApi.unresolve(documentId, commentId);
      set((state) => ({
        comments: state.comments.map((c) => (c.id === commentId ? updated : c)),
        unresolvedCount: state.unresolvedCount + 1,
      }));
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  },

  setPendingLocation: (chunkIndex, pageNumber) => {
    set({ pendingLocation: { chunkIndex, pageNumber } });
  },

  clearPendingLocation: () => {
    set({ pendingLocation: null });
  },
}));
