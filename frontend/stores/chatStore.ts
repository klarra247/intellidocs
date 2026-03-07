import { create } from 'zustand';
import { ChatMessage, ChatSource, ActiveTool, ChatHistoryResponse, SourceChunk } from '@/lib/types';
import { chatApi } from '@/lib/api';
import { streamChat } from '@/lib/sse';

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

  loadHistory: (sessionId: string) => Promise<void>;
  sendMessage: (query: string) => Promise<void>;
  stopStreaming: () => void;
  clearChat: () => void;
  toggleDocId: (id: string) => void;
  setSelectedDocIds: (ids: string[]) => void;
}

let abortController: AbortController | null = null;

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

  loadHistory: async (sessionId) => {
    try {
      const resp: ChatHistoryResponse = await chatApi.history(sessionId);
      const messages: ChatMessage[] = resp.messages.map((m) => ({
        id: m.id,
        role: m.role as 'USER' | 'ASSISTANT',
        content: m.content,
        sources: (m.sourceChunks ?? []).map(chunkToSource),
        confidence: m.confidence ?? undefined,
        createdAt: m.createdAt,
      }));
      set({ sessionId, messages, error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  sendMessage: async (query) => {
    const { sessionId, messages, selectedDocIds } = get();

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'USER',
      content: query,
      sources: [],
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
}));
