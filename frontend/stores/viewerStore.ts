import { create } from 'zustand';
import { documentsApi, chunksApi, ApiError } from '@/lib/api';
import { DocumentDetail, ChunkResponse, ExcelPreview } from '@/lib/types';

export interface HighlightInfo {
  chunkIndex: number;
  pageNumber: number | null;
  sectionTitle: string | null;
}

interface ViewerState {
  // Panel state
  isOpen: boolean;
  documentId: string | null;
  documentDetail: DocumentDetail | null;
  highlight: HighlightInfo | null;

  // Direct URL mode (for reports, etc.)
  directFileUrl: string | null;
  viewerTitle: string | null;

  // Chunk preview text (for ChunkPreview in PDF/XLSX)
  chunkText: string | null;
  chunkLoading: boolean;

  // PDF
  currentPage: number;
  totalPages: number;
  scale: number;

  // XLSX
  activeSheet: number;
  previewData: ExcelPreview | null;

  // TXT/MD/DOCX chunk viewer
  visibleChunks: ChunkResponse[];
  loadedRange: [number, number];
  chunksLoading: boolean;

  // Common
  loading: boolean;
  error: string | null;

  // Actions
  openViewer: (documentId: string, highlight?: HighlightInfo) => Promise<void>;
  openViewerWithUrl: (title: string, fileUrl: string) => void;
  closeViewer: () => void;
  navigateToHighlight: (highlight: HighlightInfo) => Promise<void>;
  setCurrentPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  setScale: (scale: number) => void;
  setActiveSheet: (index: number) => void;
  loadMoreChunks: (direction: 'before' | 'after') => Promise<void>;
}

/** File types that use the chunk text viewer (not PDF blob or XLSX preview) */
const TEXT_BASED_TYPES = new Set(['TXT', 'MD', 'DOCX']);

const initialState = {
  isOpen: false,
  documentId: null,
  documentDetail: null,
  highlight: null,
  directFileUrl: null,
  viewerTitle: null,
  chunkText: null,
  chunkLoading: false,
  currentPage: 1,
  totalPages: 0,
  scale: 1.0,
  activeSheet: 0,
  previewData: null,
  visibleChunks: [],
  loadedRange: [0, 0] as [number, number],
  chunksLoading: false,
  loading: false,
  error: null,
};

export const useViewerStore = create<ViewerState>((set, get) => ({
  ...initialState,

  openViewer: async (documentId, highlight) => {
    set({
      loading: true,
      isOpen: true,
      documentId,
      highlight: highlight ?? null,
      error: null,
      // Reset previous document state
      documentDetail: null,
      chunkText: null,
      chunkLoading: false,
      currentPage: 1,
      totalPages: 0,
      scale: 1.0,
      activeSheet: 0,
      previewData: null,
      visibleChunks: [],
      loadedRange: [0, 0],
      chunksLoading: false,
    });

    try {
      // 1. Fetch document detail
      const detail = await documentsApi.get(documentId);
      set({ documentDetail: detail });

      // 2. If highlight exists, load chunk text for ChunkPreview
      if (highlight) {
        set({ chunkLoading: true });
        try {
          const chunk = await chunksApi.get(documentId, highlight.chunkIndex);
          set({ chunkText: chunk.text, chunkLoading: false });
        } catch {
          set({ chunkText: null, chunkLoading: false });
        }
      }

      // 3. Type-specific initialization
      const fileType = detail.fileType;

      if (fileType === 'PDF') {
        set({ currentPage: highlight?.pageNumber ?? 1 });
      } else if (fileType === 'XLSX') {
        const preview = await documentsApi.getPreview(documentId);
        set({ previewData: preview });
      } else if (TEXT_BASED_TYPES.has(fileType)) {
        const totalChunks = detail.totalChunks ?? 0;
        if (totalChunks > 0) {
          const centerIndex = highlight?.chunkIndex ?? 0;
          await _loadChunkRange(documentId, centerIndex, totalChunks, set);
        }
      }

      set({ loading: false });
    } catch (e) {
      set({ error: _friendlyError(e), loading: false });
    }
  },

  openViewerWithUrl: (title, fileUrl) => {
    set({
      ...initialState,
      isOpen: true,
      directFileUrl: fileUrl,
      viewerTitle: title,
    });
  },

  closeViewer: () => {
    set({ ...initialState });
  },

  navigateToHighlight: async (highlight) => {
    const { documentId, documentDetail, loadedRange, currentPage } = get();
    if (!documentId || !documentDetail) return;

    set({ highlight });

    // Load chunk text for ChunkPreview
    set({ chunkLoading: true });
    try {
      const chunk = await chunksApi.get(documentId, highlight.chunkIndex);
      set({ chunkText: chunk.text, chunkLoading: false });
    } catch {
      set({ chunkText: null, chunkLoading: false });
    }

    const fileType = documentDetail.fileType;

    if (fileType === 'PDF') {
      set({ currentPage: highlight.pageNumber ?? currentPage });
    } else if (TEXT_BASED_TYPES.has(fileType)) {
      const totalChunks = documentDetail.totalChunks ?? 0;
      const [start, end] = loadedRange;
      // If the target chunkIndex is outside the currently loaded range, reload
      if (
        highlight.chunkIndex < start ||
        highlight.chunkIndex > end ||
        totalChunks === 0
      ) {
        await _loadChunkRange(
          documentId,
          highlight.chunkIndex,
          totalChunks,
          set,
        );
      }
    }
    // XLSX: no special navigation needed (sheet/scroll handled by component)
  },

  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (total) => set({ totalPages: total }),
  setScale: (scale) => set({ scale }),
  setActiveSheet: (index) => set({ activeSheet: index }),

  loadMoreChunks: async (direction) => {
    const { documentId, documentDetail, loadedRange, visibleChunks, chunksLoading } = get();
    if (!documentId || !documentDetail || chunksLoading) return;

    const totalChunks = documentDetail.totalChunks ?? 0;
    if (totalChunks === 0) return;

    const [currentStart, currentEnd] = loadedRange;
    let indices: number[] = [];
    let newStart = currentStart;
    let newEnd = currentEnd;

    if (direction === 'before') {
      newStart = Math.max(0, currentStart - 10);
      indices = Array.from(
        { length: currentStart - newStart },
        (_, i) => newStart + i,
      );
    } else {
      newEnd = Math.min(totalChunks - 1, currentEnd + 10);
      indices = Array.from(
        { length: newEnd - currentEnd },
        (_, i) => currentEnd + 1 + i,
      );
    }

    if (indices.length === 0) return;

    set({ chunksLoading: true });
    try {
      const result = await chunksApi.getBulk(documentId, indices);
      const newChunks = result.chunks;

      if (direction === 'before') {
        const merged = [...newChunks, ...visibleChunks].sort(
          (a, b) => a.chunkIndex - b.chunkIndex,
        );
        set({
          visibleChunks: merged,
          loadedRange: [newStart, currentEnd],
          chunksLoading: false,
        });
      } else {
        const merged = [...visibleChunks, ...newChunks].sort(
          (a, b) => a.chunkIndex - b.chunkIndex,
        );
        set({
          visibleChunks: merged,
          loadedRange: [currentStart, newEnd],
          chunksLoading: false,
        });
      }
    } catch (e) {
      set({ error: _friendlyError(e), chunksLoading: false });
    }
  },
}));

/** Map API errors to user-friendly Korean messages */
function _friendlyError(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.status) {
      case 404:
        return '문서를 찾을 수 없습니다. 삭제되었을 수 있습니다.';
      case 409:
        return '문서 처리가 아직 완료되지 않았습니다.';
      case 502:
      case 503:
        return '서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.';
    }
  }
  if (e instanceof TypeError && (e as Error).message === 'Failed to fetch') {
    return '네트워크 연결을 확인해주세요.';
  }
  return (e as Error).message || '알 수 없는 오류가 발생했습니다.';
}

/** Internal helper: load a range of chunks centered on centerIndex */
async function _loadChunkRange(
  documentId: string,
  centerIndex: number,
  totalChunks: number,
  set: (partial: Partial<ViewerState>) => void,
) {
  const start = Math.max(0, centerIndex - 5);
  const end = Math.min(totalChunks - 1, centerIndex + 5);
  const indices = Array.from(
    { length: end - start + 1 },
    (_, i) => start + i,
  );

  set({ chunksLoading: true });
  try {
    const result = await chunksApi.getBulk(documentId, indices);
    const sorted = result.chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    set({
      visibleChunks: sorted,
      loadedRange: [start, end],
      chunksLoading: false,
    });
  } catch (e) {
    set({ error: _friendlyError(e), chunksLoading: false });
  }
}
