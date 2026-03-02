// === API Response Envelope ===
// Backend error is ErrorInfo { code, message } object, not a plain string
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

// === Document ===
export type DocumentStatus =
  | 'UPLOADING'
  | 'PARSING'
  | 'PARSED'
  | 'INDEXING'
  | 'INDEXED'
  | 'FAILED';

export type FileType = 'PDF' | 'DOCX' | 'XLSX' | 'TXT' | 'MD';

// Matches backend DocumentDto.UploadResponse
export interface UploadResponse {
  documentId: string;
  filename: string;
  fileType: FileType;
  status: DocumentStatus;
}

// Matches backend DocumentDto.ListResponse
export interface Document {
  id: string;
  originalFilename: string;
  fileType: FileType;
  fileSize: number;
  status: DocumentStatus;
  createdAt: string;
}

// Matches backend DocumentDto.DetailResponse
export interface DocumentDetail {
  id: string;
  filename: string;
  originalFilename: string;
  fileType: FileType;
  fileSize: number;
  status: DocumentStatus;
  totalPages: number | null;
  totalChunks: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// === SSE Events ===
export interface DocumentStatusEvent {
  documentId: string;
  status: DocumentStatus;
  progress: number; // 0-100
  message: string;
}

// === Search ===
export interface SearchRequest {
  query: string;
  documentIds?: string[];
  topK?: number;
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  filename: string;
  text: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  chunkType: 'TEXT' | 'TABLE';
  score: number;
}

// === Chat ===

// Backend SourceInfo (from streaming "sources" event)
export interface ChatSource {
  documentId: string;
  filename: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  relevanceScore: number;
  pageRange: string | null;
}

// Backend ChatMessage.SourceChunk (from history API)
export interface SourceChunk {
  documentId: string;
  filename: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  snippetText: string | null;
}

// Unified message type for UI
export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources: ChatSource[];
  confidence?: number;
  createdAt: string;
}

// Backend ChatHistoryResponse
export interface ChatHistoryResponse {
  sessionId: string;
  title: string;
  createdAt: string;
  messages: {
    id: string;
    role: string;
    content: string;
    sourceChunks: SourceChunk[] | null;
    confidence: number | null;
    createdAt: string;
  }[];
}

// Active tool indicator
export interface ActiveTool {
  tool: string;
  message: string;
}
