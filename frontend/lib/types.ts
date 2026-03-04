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

// === Reports ===
export type ReportType = 'FINANCIAL_ANALYSIS' | 'COMPARISON' | 'SUMMARY';
export type ReportStatus = 'PENDING' | 'GENERATING' | 'RENDERING' | 'COMPLETED' | 'FAILED';

export interface ReportGenerateRequest {
  reportType: ReportType;
  title: string;
  documentIds?: string[];
  prompt?: string;
}

export interface ReportGenerateResponse {
  reportId: string;
  status: ReportStatus;
}

export interface Report {
  id: string;
  title: string;
  reportType: ReportType;
  status: ReportStatus;
  fileSize: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ReportStatusEvent {
  reportId: string;
  status: ReportStatus;
  message: string;
  progress: number;
}

// === Discrepancy ===
export type DiscrepancyStatus = 'PENDING' | 'DETECTING' | 'COMPLETED' | 'FAILED';
export type TriggerType = 'MANUAL' | 'AUTO' | 'TOOL';
export type DiscrepancySeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface DiscrepancyEntry {
  documentId: string;
  filename: string;
  value: string;
  numericValue: number;
  unit: string;
  page: number | null;
  chunkIndex: number | null;
}

export interface Discrepancy {
  field: string;
  period: string;
  entries: DiscrepancyEntry[];
  difference: string;
  differencePercent: number;
  severity: DiscrepancySeverity;
}

export interface DiscrepancySummary {
  totalFieldsChecked: number;
  discrepanciesFound: number;
  bySeverity: Record<string, number>;
}

export interface DiscrepancyResultData {
  discrepancies: Discrepancy[];
  summary: DiscrepancySummary;
  checkedFields: string[];
}

export interface DiscrepancyResult {
  id: string;
  documentIds: string[];
  status: DiscrepancyStatus;
  triggerType: string;
  resultData: DiscrepancyResultData | null;
  tolerance: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiscrepancyDetectRequest {
  documentIds: string[];
  targetFields?: string[];
  tolerance?: number;
}

export interface DiscrepancyDetectResponse {
  jobId: string;
  status: string;
}

export interface DiscrepancyStatusEvent {
  jobId: string;
  status: DiscrepancyStatus;
  message: string;
  progress: number;
}
