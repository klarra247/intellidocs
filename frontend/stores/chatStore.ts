import { create } from 'zustand';
import { ChatMessage, ChatSource, ActiveTool, ChatHistoryResponse, SourceChunk, SessionSummary, PinnedMessageResponse, CommentResponse, SelectedDocument } from '@/lib/types';
import { chatApi, sessionsApi, messagesApi } from '@/lib/api';
import { streamChat } from '@/lib/sse';
import { useDocumentStore } from '@/stores/documentStore';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface ChatState {
  sessionId: string | null;
  messages: ChatMessage[];
  streaming: boolean;
  streamingContent: string;
  streamingSources: ChatSource[];
  streamingConfidence: number | null;
  activeTools: ActiveTool[];
  error: string | null;
  selectedDocIds: string[];

  // Session collaboration
  sessions: SessionSummary[];
  sessionsLoading: boolean;
  isShared: boolean;
  isOwner: boolean;
  creatorName: string | null;

  // Pinned messages
  pinnedMessages: PinnedMessageResponse[];

  // Comments
  commentPanelMessageId: string | null;
  comments: CommentResponse[];
  commentsLoading: boolean;

  // Toast
  toast: ToastState | null;

  // Existing actions
  loadHistory: (sessionId: string) => Promise<void>;
  sendMessage: (query: string) => Promise<void>;
  stopStreaming: () => void;
  clearChat: () => void;
  toggleDocId: (id: string) => void;
  setSelectedDocIds: (ids: string[]) => void;

  // Session actions
  loadSessions: () => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  shareSession: (id: string) => Promise<void>;
  unshareSession: (id: string) => Promise<void>;
  updateReadStatus: (sessionId: string) => Promise<void>;

  // Pin actions
  pinMessage: (id: string) => Promise<void>;
  unpinMessage: (id: string) => Promise<void>;
  loadPinnedMessages: (sessionId: string) => Promise<void>;

  // Comment actions
  openCommentPanel: (messageId: string) => void;
  closeCommentPanel: () => void;
  loadComments: (messageId: string) => Promise<void>;
  createComment: (messageId: string, content: string) => Promise<void>;
  updateComment: (msgId: string, commentId: string, content: string) => Promise<void>;
  deleteComment: (msgId: string, commentId: string) => Promise<void>;

  // Toast
  showToast: (message: string, type: 'success' | 'error') => void;
}

let abortController: AbortController | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

/** Convert backend SourceChunk to frontend ChatSource */
function chunkToSource(chunk: SourceChunk): ChatSource {
  return {
    documentId: chunk.documentId,
    filename: chunk.filename,
    pageNumber: chunk.pageNumber,
    sectionTitle: chunk.sectionTitle,
    chunkIndex: chunk.chunkIndex ?? null,
    relevanceScore: chunk.relevanceScore ?? 0,
    pageRange: chunk.pageNumber ? `p.${chunk.pageNumber}` : null,
  };
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessionId: null,
  messages: [],
  streaming: false,
  streamingContent: '',
  streamingSources: [],
  streamingConfidence: null,
  activeTools: [],
  error: null,
  selectedDocIds: [],

  sessions: [],
  sessionsLoading: false,
  isShared: false,
  isOwner: true,
  creatorName: null,

  pinnedMessages: [],

  commentPanelMessageId: null,
  comments: [],
  commentsLoading: false,

  toast: null,

  loadHistory: async (sessionId) => {
    try {
      const resp: ChatHistoryResponse = await chatApi.history(sessionId);
      const messages: ChatMessage[] = resp.messages.map((m) => ({
        id: m.id,
        role: m.role as 'USER' | 'ASSISTANT',
        content: m.content,
        sources: (m.sourceChunks ?? []).map(chunkToSource),
        selectedDocuments: m.selectedDocuments ?? undefined,
        confidence: m.confidence ?? undefined,
        isPinned: m.isPinned,
        pinnedBy: m.pinnedBy ?? undefined,
        pinnedAt: m.pinnedAt ?? undefined,
        commentCount: m.commentCount,
        createdAt: m.createdAt,
      }));

      // Derive isShared/isOwner/creatorName from sessions list if available
      const session = get().sessions.find((s) => s.id === sessionId);
      set({
        sessionId,
        messages,
        error: null,
        isShared: session?.isShared ?? false,
        isOwner: session?.isOwner ?? true,
        creatorName: session?.creatorName ?? null,
      });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  sendMessage: async (query) => {
    const { sessionId, messages, selectedDocIds } = get();

    // Build selectedDocuments for optimistic UI display
    const selectedDocuments: SelectedDocument[] | undefined =
      selectedDocIds.length > 0
        ? selectedDocIds
            .map((id) => {
              const doc = useDocumentStore.getState().documents.find((d) => d.id === id);
              return doc ? { id, filename: doc.originalFilename } : null;
            })
            .filter((d): d is SelectedDocument => d !== null)
        : undefined;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'USER',
      content: query,
      sources: [],
      selectedDocuments,
      createdAt: new Date().toISOString(),
    };

    set({
      messages: [...messages, userMessage],
      streaming: true,
      streamingContent: '',
      streamingSources: [],
      streamingConfidence: null,
      activeTools: [],
      error: null,
    });

    abortController = new AbortController();

    try {
      await streamChat(
        {
          question: query,
          sessionId: sessionId ?? undefined,
          documentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
        },
        (eventName: string, data: Record<string, unknown>) => {
          const state = get();
          switch (eventName) {
            case 'token':
              set({
                streamingContent:
                  state.streamingContent + ((data.text as string) ?? ''),
              });
              break;

            case 'tool_start':
              set({
                activeTools: [
                  ...state.activeTools,
                  {
                    tool: (data.tool as string) ?? '',
                    message: (data.message as string) ?? '',
                  },
                ],
              });
              break;

            case 'tool_end':
              set({
                activeTools: state.activeTools.filter(
                  (t) => t.tool !== (data.tool as string),
                ),
              });
              break;

            case 'sources': {
              const sources = (data.sources as ChatSource[]) ?? [];
              set({
                streamingSources: sources,
                streamingConfidence: (data.confidence as number) ?? null,
              });
              break;
            }

            case 'done': {
              if (data.sessionId) {
                set({ sessionId: data.sessionId as string });
              }
              const assistantMessage: ChatMessage = {
                id: (data.messageId as string) ?? crypto.randomUUID(),
                role: 'ASSISTANT',
                content: state.streamingContent,
                sources: state.streamingSources,
                confidence: state.streamingConfidence ?? undefined,
                createdAt: new Date().toISOString(),
              };
              set({
                messages: [...state.messages, assistantMessage],
                streaming: false,
                streamingContent: '',
                streamingSources: [],
                streamingConfidence: null,
                activeTools: [],
              });
              // Refresh sessions list & mark as read (user is viewing this session)
              get().loadSessions();
              const sid = get().sessionId;
              if (sid) get().updateReadStatus(sid);
              break;
            }

            case 'error':
              set({
                error: (data.message as string) ?? 'Stream error',
                streaming: false,
                activeTools: [],
              });
              break;
          }
        },
        abortController.signal,
      );
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        set({ error: (e as Error).message, streaming: false, activeTools: [] });
      }
    }
  },

  stopStreaming: () => {
    abortController?.abort();
    const { streamingContent, streamingSources, streamingConfidence, messages } = get();
    if (streamingContent) {
      const partialMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'ASSISTANT',
        content: streamingContent,
        sources: streamingSources,
        confidence: streamingConfidence ?? undefined,
        createdAt: new Date().toISOString(),
      };
      set({
        messages: [...messages, partialMessage],
        streaming: false,
        streamingContent: '',
        streamingSources: [],
        streamingConfidence: null,
        activeTools: [],
        error: null,
      });
    } else {
      set({ streaming: false, activeTools: [], error: null });
    }
  },

  clearChat: () => {
    abortController?.abort();
    set({
      sessionId: null,
      messages: [],
      streaming: false,
      streamingContent: '',
      streamingSources: [],
      streamingConfidence: null,
      activeTools: [],
      error: null,
      selectedDocIds: [],
      isShared: false,
      isOwner: true,
      creatorName: null,
      pinnedMessages: [],
      commentPanelMessageId: null,
      comments: [],
    });
  },

  toggleDocId: (id) => {
    const { selectedDocIds } = get();
    set({
      selectedDocIds: selectedDocIds.includes(id)
        ? selectedDocIds.filter((d) => d !== id)
        : [...selectedDocIds, id],
    });
  },

  setSelectedDocIds: (ids) => {
    set({ selectedDocIds: ids });
  },

  // === Session actions ===

  loadSessions: async () => {
    set({ sessionsLoading: true });
    try {
      const sessions = await sessionsApi.list();
      set({ sessions, sessionsLoading: false });
    } catch {
      set({ sessionsLoading: false });
    }
  },

  selectSession: async (id) => {
    const { loadHistory, loadPinnedMessages, updateReadStatus } = get();
    set({ commentPanelMessageId: null, comments: [], selectedDocIds: [] });
    await loadHistory(id);
    loadPinnedMessages(id);
    updateReadStatus(id);
  },

  shareSession: async (id) => {
    try {
      await sessionsApi.share(id);
      set({ isShared: true });
      // Update in sessions list
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, isShared: true } : s,
        ),
      }));
      get().showToast('세션이 공유되었습니다', 'success');
    } catch (e) {
      get().showToast((e as Error).message, 'error');
    }
  },

  unshareSession: async (id) => {
    try {
      await sessionsApi.unshare(id);
      set({ isShared: false });
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, isShared: false } : s,
        ),
      }));
      get().showToast('공유가 해제되었습니다', 'success');
    } catch (e) {
      get().showToast((e as Error).message, 'error');
    }
  },

  updateReadStatus: async (sessionId) => {
    const { messages } = get();
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    try {
      await sessionsApi.updateReadStatus(sessionId, lastMessage.id);
      // Update unread count in sessions list
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, unreadCount: 0 } : s,
        ),
      }));
    } catch {
      // silently ignore
    }
  },

  // === Pin actions ===

  pinMessage: async (id) => {
    try {
      const resp = await messagesApi.pin(id);
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === id
            ? { ...m, isPinned: true, pinnedBy: resp.pinnedBy, pinnedAt: resp.pinnedAt }
            : m,
        ),
      }));
      // Reload pinned messages list
      const { sessionId } = get();
      if (sessionId) get().loadPinnedMessages(sessionId);
      get().showToast('메시지가 고정되었습니다', 'success');
    } catch (e) {
      get().showToast((e as Error).message, 'error');
    }
  },

  unpinMessage: async (id) => {
    try {
      await messagesApi.unpin(id);
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === id
            ? { ...m, isPinned: false, pinnedBy: undefined, pinnedAt: undefined }
            : m,
        ),
      }));
      const { sessionId } = get();
      if (sessionId) get().loadPinnedMessages(sessionId);
      get().showToast('고정이 해제되었습니다', 'success');
    } catch (e) {
      get().showToast((e as Error).message, 'error');
    }
  },

  loadPinnedMessages: async (sessionId) => {
    try {
      const pinned = await sessionsApi.getPinnedMessages(sessionId);
      set({ pinnedMessages: pinned });
    } catch {
      set({ pinnedMessages: [] });
    }
  },

  // === Comment actions ===

  openCommentPanel: (messageId) => {
    set({ commentPanelMessageId: messageId, comments: [], commentsLoading: true });
    get().loadComments(messageId);
  },

  closeCommentPanel: () => {
    set({ commentPanelMessageId: null, comments: [], commentsLoading: false });
  },

  loadComments: async (messageId) => {
    set({ commentsLoading: true });
    try {
      const comments = await messagesApi.getComments(messageId);
      set({ comments, commentsLoading: false });
    } catch {
      set({ commentsLoading: false });
    }
  },

  createComment: async (messageId, content) => {
    try {
      const comment = await messagesApi.createComment(messageId, content);
      set((state) => ({
        comments: [...state.comments, comment],
        messages: state.messages.map((m) =>
          m.id === messageId
            ? { ...m, commentCount: (m.commentCount ?? 0) + 1 }
            : m,
        ),
      }));
    } catch (e) {
      get().showToast((e as Error).message, 'error');
    }
  },

  updateComment: async (msgId, commentId, content) => {
    try {
      const updated = await messagesApi.updateComment(msgId, commentId, content);
      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === commentId ? updated : c,
        ),
      }));
    } catch (e) {
      get().showToast((e as Error).message, 'error');
    }
  },

  deleteComment: async (msgId, commentId) => {
    try {
      await messagesApi.deleteComment(msgId, commentId);
      set((state) => ({
        comments: state.comments.filter((c) => c.id !== commentId),
        messages: state.messages.map((m) =>
          m.id === msgId
            ? { ...m, commentCount: Math.max((m.commentCount ?? 1) - 1, 0) }
            : m,
        ),
      }));
    } catch (e) {
      get().showToast((e as Error).message, 'error');
    }
  },

  // === Toast ===

  showToast: (message, type) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { message, type } });
    toastTimer = setTimeout(() => {
      set({ toast: null });
    }, 3000);
  },
}));
