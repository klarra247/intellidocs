package com.intellidocs.domain.chat.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.agent.dto.SourceInfo;
import com.intellidocs.domain.chat.dto.ChatHistoryResponse;
import com.intellidocs.domain.chat.entity.ChatMessage;
import com.intellidocs.domain.chat.entity.ChatSession;
import com.intellidocs.domain.chat.repository.ChatMessageRepository;
import com.intellidocs.domain.chat.repository.ChatSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatHistoryService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;

    private static final UUID TEMP_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Transactional
    public ChatSession getOrCreateSession(UUID sessionId) {
        if (sessionId != null) {
            return chatSessionRepository.findById(sessionId)
                    .orElseGet(this::createSession);
        }
        return createSession();
    }

    private ChatSession createSession() {
        // Always let @GeneratedValue handle ID generation.
        // Manually setting the ID on a @GeneratedValue entity causes
        // Spring Data to call merge() instead of persist(), which can
        // fail or generate a different ID.
        return chatSessionRepository.save(
                ChatSession.builder()
                        .userId(TEMP_USER_ID)
                        .build());
    }

    @Transactional
    public ChatMessage saveUserMessage(ChatSession session, String content) {
        ChatMessage message = ChatMessage.builder()
                .session(session)
                .role(ChatMessage.Role.USER)
                .content(content)
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
                                              double confidence) {
        ChatSession session = getOrCreateSession(sessionId);
        saveUserMessage(session, question);
        ChatMessage assistantMsg = saveAssistantMessage(session, answer, sources, confidence);
        updateSessionTitle(session, question);
        return new PersistResult(session, assistantMsg);
    }

    public record PersistResult(ChatSession session, ChatMessage assistantMessage) {}

    @Transactional(readOnly = true)
    public ChatHistoryResponse getHistory(UUID sessionId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> BusinessException.notFound("ChatSession", sessionId));

        List<ChatMessage> messages = chatMessageRepository
                .findBySessionIdOrderByCreatedAtAsc(sessionId);

        List<ChatHistoryResponse.MessageDto> messageDtos = messages.stream()
                .map(m -> ChatHistoryResponse.MessageDto.builder()
                        .id(m.getId())
                        .role(m.getRole().name())
                        .content(m.getContent())
                        .sourceChunks(m.getSourceChunks())
                        .confidence(m.getConfidence())
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
