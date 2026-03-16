// === Auth ===
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  profileImageUrl: string | null;
  authProvider: 'LOCAL' | 'GOOGLE';
  emailVerified: boolean;
  role: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthResponse {
  token: TokenResponse;
  user: AuthUser;
}

// === API Response Envelope ===
// Backend error is ErrorInfo { code, message } object, not a plain string
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

// === Review ===
export type ReviewStatus = 'NONE' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

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
  reviewStatus: ReviewStatus;
  uploaderId: string | null;
  versionNumber?: number;
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
  reviewStatus: ReviewStatus;
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
  chunkIndex: number | null;
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
  chunkIndex: number | null;
  relevanceScore: number | null;
}

// Selected document scope for USER messages
export interface SelectedDocument {
  id: string;
  filename: string;
}

// Unified message type for UI
export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources: ChatSource[];
  selectedDocuments?: SelectedDocument[];
  confidence?: number;
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
  commentCount?: number;
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
    selectedDocuments: SelectedDocument[] | null;
    confidence: number | null;
    isPinned: boolean;
    pinnedBy: string | null;
    pinnedAt: string | null;
    commentCount: number;
    createdAt: string;
  }[];
}

// === Chat Collaboration ===

export interface SessionSummary {
  id: string;
  title: string;
  creatorId: string;
  creatorName: string;
  isShared: boolean;
  isOwner: boolean;
  messageCount: number;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
}

export interface ShareResponse {
  isShared: boolean;
  sharedAt: string | null;
}

export interface ReadStatusResponse {
  sessionId: string;
  lastReadMessageId: string;
  lastReadAt: string;
}

export interface PinResponse {
  messageId: string;
  isPinned: boolean;
  pinnedBy: string;
  pinnedAt: string;
}

export interface PinnedMessageResponse {
  id: string;
  role: string;
  content: string;
  sourceChunks: SourceChunk[] | null;
  confidence: number | null;
  isPinned: boolean;
  pinnedBy: string;
  pinnedAt: string;
  createdAt: string;
}

export interface CommentResponse {
  id: string;
  userId: string;
  userName: string;
  userProfileImage: string | null;
  content: string;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
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

// === Chunk Viewer ===
export interface ChunkResponse {
  documentId: string;
  originalFilename: string;
  chunkIndex: number;
  text: string | null;
  pageNumber: number | null;
  sectionTitle: string | null;
  chunkType: 'TEXT' | 'TABLE';
  tokenCount: number;
  warning: string | null;
}

export interface BulkChunkResponse {
  documentId: string;
  chunks: ChunkResponse[];
  notFound: number[];
}

export interface ExcelSheet {
  sheetName: string;
  headers: string[];
  rows: string[][];
  totalRows: number;
  totalCols: number;
  truncatedRows: boolean;
  truncatedCols: boolean;
}

export interface ExcelPreview {
  sheets: ExcelSheet[];
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

// === Document Versions ===
export interface DocumentVersion {
  documentId: string;
  versionNumber: number;
  originalFilename: string;
  fileType: FileType;
  fileSize: number;
  status: DocumentStatus;
  createdAt: string;
  diffStatus: string | null;
  diffId: string | null;
}

export interface DiffSummary {
  totalChanges: number;
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

export interface NumericChange {
  field: string;
  period: string;
  sourceValue: string;
  targetValue: string;
  unit: string;
  changeAbsolute: number;
  changePercent: number;
  direction: string;
  sourcePageNumber: number | null;
  targetPageNumber: number | null;
}

export interface TextChange {
  type: 'ADDED' | 'REMOVED' | 'MODIFIED';
  sectionTitle: string;
  summary: string;
  sourcePageNumber?: number | null;
  targetPageNumber?: number | null;
}

export interface DiffResultData {
  summary: DiffSummary;
  numericChanges: NumericChange[];
  textChanges: TextChange[];
  metadata: {
    sourceFilename: string;
    targetFilename: string;
    analysisModel: string;
    processedAt: string;
  };
}

export interface DiffDetailResponse {
  id: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  diffType: string;
  status: string;
  resultData: DiffResultData | null;
  createdAt: string;
}

export interface DiffResponse {
  diffId: string;
  status: string;
}

export interface DiffStatusEvent {
  diffId: string;
  status: string;
  message: string;
  progress: number;
}

export interface VersionUploadResponse {
  documentId: string;
  versionGroupId: string;
  versionNumber: number;
  parentVersionId: string;
  status: DocumentStatus;
}

// === Workspace ===
export type WorkspaceType = 'PERSONAL' | 'TEAM';
export type WorkspaceMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  type: WorkspaceType;
  role: WorkspaceMemberRole;
  memberCount: number;
  createdAt: string;
}

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
  role: WorkspaceMemberRole;
  joinedAt: string;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  description: string | null;
  type: WorkspaceType;
  myRole: WorkspaceMemberRole;
  maxMembers: number;
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceInviteResponse {
  invitationId: string;
  token: string;
  email: string;
  status: InvitationStatus;
  expiresAt: string;
}

export interface PendingInvitation {
  id: string;
  token: string;
  workspaceName: string;
  inviterName: string;
  inviterEmail: string;
  role: WorkspaceMemberRole;
  expiresAt: string;
}

// === Document Comments ===
export interface DocumentCommentResponse {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  userProfileImage: string | null;
  chunkIndex: number | null;
  pageNumber: number | null;
  content: string;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentCommentListResponse {
  comments: DocumentCommentResponse[];
  totalCount: number;
  unresolvedCount: number;
}

// === Document Review ===
export interface ReviewResponse {
  documentId: string;
  reviewStatus: ReviewStatus;
  reviewRequestedBy: string | null;
  reviewRequestedByName: string | null;
  reviewRequestedAt: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
}

// === Knowledge Graph (Metric-Centric) ===

export interface MetricOccurrence {
  documentId: string;
  documentName: string;
  value: string;
  numericValue: number | null;
  unit: string;
  period: string;
  pageNumber: number | null;
}

export interface MetricChange {
  from: number;
  to: number;
  changePercent: number | null;
  direction: 'increase' | 'decrease' | 'unchanged';
}

export interface GraphNode {
  id: string;
  type: 'document' | 'metric';
  name: string;
  // document fields
  fileType?: string;
  status?: string;
  metricsCount?: number;
  // metric fields
  occurrences?: MetricOccurrence[];
  change?: MetricChange | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  period?: string;
  value?: string;
}

export interface GraphStats {
  totalDocuments: number;
  totalMetrics: number;
  totalEdges: number;
  crossDocumentMetrics: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: GraphStats;
}

export interface MetricDetailResponse {
  metricName: string;
  occurrences: MetricOccurrence[];
  change: MetricChange | null;
}

export interface GraphSearchResponse {
  results: GraphNode[];
}

export interface GraphRebuildResponse {
  status: string;
  message: string;
}

export interface GraphStatsResponse {
  totalDocuments: number;
  totalMetrics: number;
  crossDocumentMetrics: number;
}
