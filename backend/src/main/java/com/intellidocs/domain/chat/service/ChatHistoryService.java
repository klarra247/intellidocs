package com.intellidocs.domain.chat.service;

import com.intellidocs.common.WorkspaceContext;
import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.agent.dto.SourceInfo;
import com.intellidocs.domain.auth.entity.User;
import com.intellidocs.domain.auth.repository.UserRepository;
import com.intellidocs.domain.chat.dto.ChatHistoryResponse;
import com.intellidocs.domain.chat.entity.ChatMessage;
import com.intellidocs.domain.chat.entity.ChatSession;
import com.intellidocs.domain.chat.repository.ChatMessageRepository;
import com.intellidocs.domain.chat.repository.ChatSessionRepository;
import com.intellidocs.domain.chat.repository.CommentRepository;
import com.intellidocs.domain.document.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatHistoryService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final SessionAccessService sessionAccessService;
    private final DocumentRepository documentRepository;

    @Transactional
    public ChatSession getOrCreateSession(UUID sessionId, UUID userId, UUID workspaceId) {
        if (sessionId != null) {
            return chatSessionRepository.findById(sessionId)
                    .orElseGet(() -> createSession(userId, workspaceId));
        }
        return createSession(userId, workspaceId);
    }

    private ChatSession createSession(UUID userId, UUID workspaceId) {
        String creatorName = userRepository.findById(userId)
                .map(User::getName)
                .orElse(null);

        // workspaceId가 명시적으로 전달되지 않으면 ThreadLocal fallback
        UUID resolvedWorkspaceId = workspaceId != null
                ? workspaceId
                : WorkspaceContext.getCurrentWorkspaceId();

        return chatSessionRepository.save(
                ChatSession.builder()
                        .userId(userId)
                        .workspaceId(resolvedWorkspaceId)
                        .creatorName(creatorName)
                        .build());
    }

    @Transactional
    public ChatMessage saveUserMessage(ChatSession session, String content,
                                        List<ChatMessage.SelectedDocument> selectedDocuments) {
        ChatMessage message = ChatMessage.builder()
                .session(session)
                .role(ChatMessage.Role.USER)
                .content(content)
                .selectedDocuments(selectedDocuments)
                .build();
        return chatMessageRepository.save(message);
    }

    @Transactional
    public ChatMessage saveAssistantMessage(ChatSession session, String content,
                                             List<SourceInfo> sources, double confidence) {
        List<ChatMessage.SourceChunk> sourceChunks = sources.stream()
                .map(s -> ChatMessage.SourceChunk.builder()
                        .documentId(s.getDocumentId() != null ? s.getDocumentId().toString() : null)
                        .filename(s.getFilename())
                        .pageNumber(s.getPageNumber())
                        .sectionTitle(s.getSectionTitle())
                        .chunkIndex(s.getChunkIndex())
                        .relevanceScore(s.getRelevanceScore())
                        .build())
                .toList();

        ChatMessage message = ChatMessage.builder()
                .session(session)
                .role(ChatMessage.Role.ASSISTANT)
                .content(content)
                .sourceChunks(sourceChunks)
                .confidence(confidence)
                .build();
        return chatMessageRepository.save(message);
    }

    @Transactional
    public void updateSessionTitle(ChatSession session, String firstQuestion) {
        if (session.getTitle() == null || session.getTitle().isBlank()) {
            String title = firstQuestion.length() > 50
                    ? firstQuestion.substring(0, 50) + "..."
                    : firstQuestion;
            session.updateTitle(title);
            chatSessionRepository.save(session);
        }
    }

    /**
     * Persist an entire conversation turn (user question + assistant answer) in a single transaction.
     * This avoids detached-entity issues that arise when each save runs in its own transaction.
     *
     * @return the persisted ChatSession (managed, with DB-generated ID)
     */
    @Transactional
    public PersistResult persistConversation(UUID sessionId, String question,
                                              String answer, List<SourceInfo> sources,
                                              double confidence, UUID userId) {
        return persistConversation(sessionId, question, answer, sources, confidence, userId, null, null);
    }

    /**
     * Overload that accepts explicit workspaceId for async contexts (e.g. SSE callbacks)
     * where ThreadLocal WorkspaceContext is unavailable.
     */
    @Transactional
    public PersistResult persistConversation(UUID sessionId, String question,
                                              String answer, List<SourceInfo> sources,
                                              double confidence, UUID userId,
                                              UUID workspaceId) {
        return persistConversation(sessionId, question, answer, sources, confidence, userId, workspaceId, null);
    }

    @Transactional
    public PersistResult persistConversation(UUID sessionId, String question,
                                              String answer, List<SourceInfo> sources,
                                              double confidence, UUID userId,
                                              UUID workspaceId, List<UUID> documentIds) {
        ChatSession session = getOrCreateSession(sessionId, userId, workspaceId);

        // 공유 세션에 비생성자가 쓰기 시도하면 차단
        if (sessionId != null && !session.isCreator(userId)) {
            throw BusinessException.forbidden("공유 세션에 메시지를 작성할 수 없습니다");
        }

        // Resolve documentIds to SelectedDocument snapshots
        List<ChatMessage.SelectedDocument> selectedDocuments = null;
        if (documentIds != null && !documentIds.isEmpty()) {
            selectedDocuments = documentRepository.findAllById(documentIds).stream()
                    .map(doc -> ChatMessage.SelectedDocument.builder()
                            .id(doc.getId().toString())
                            .filename(doc.getOriginalFilename())
                            .build())
                    .toList();
        }

        saveUserMessage(session, question, selectedDocuments);
        ChatMessage assistantMsg = saveAssistantMessage(session, answer, sources, confidence);
        updateSessionTitle(session, question);
        return new PersistResult(session, assistantMsg);
    }

    public record PersistResult(ChatSession session, ChatMessage assistantMessage) {}

    @Transactional(readOnly = true)
    public ChatHistoryResponse getHistory(UUID sessionId, UUID userId) {
        ChatSession session = sessionAccessService.getSessionWithAccessCheck(sessionId, userId);

        List<ChatMessage> messages = chatMessageRepository
                .findBySessionIdOrderByCreatedAtAsc(sessionId);

        // Batch comment counts (1 query instead of N)
        List<UUID> messageIds = messages.stream().map(ChatMessage::getId).toList();
        Map<UUID, Long> commentCountMap = messageIds.isEmpty()
                ? Map.of()
                : commentRepository.countByMessageIds(messageIds).stream()
                        .collect(Collectors.toMap(r -> (UUID) r[0], r -> (Long) r[1]));

        List<ChatHistoryResponse.MessageDto> messageDtos = messages.stream()
                .map(m -> ChatHistoryResponse.MessageDto.builder()
                        .id(m.getId())
                        .role(m.getRole().name())
                        .content(m.getContent())
                        .sourceChunks(m.getSourceChunks())
                        .selectedDocuments(m.getSelectedDocuments())
                        .confidence(m.getConfidence())
                        .isPinned(Boolean.TRUE.equals(m.getIsPinned()))
                        .pinnedBy(m.getPinnedBy())
                        .pinnedAt(m.getPinnedAt())
                        .commentCount(commentCountMap.getOrDefault(m.getId(), 0L))
                        .createdAt(m.getCreatedAt())
                        .build())
                .toList();

        return ChatHistoryResponse.builder()
                .sessionId(session.getId())
                .title(session.getTitle())
                .createdAt(session.getCreatedAt())
                .messages(messageDtos)
                .build();
    }
}
