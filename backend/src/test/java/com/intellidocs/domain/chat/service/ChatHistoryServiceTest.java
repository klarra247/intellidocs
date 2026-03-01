package com.intellidocs.domain.chat.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.agent.dto.SourceInfo;
import com.intellidocs.domain.chat.dto.ChatHistoryResponse;
import com.intellidocs.domain.chat.entity.ChatMessage;
import com.intellidocs.domain.chat.entity.ChatSession;
import com.intellidocs.domain.chat.repository.ChatMessageRepository;
import com.intellidocs.domain.chat.repository.ChatSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatHistoryServiceTest {

    @Mock private ChatSessionRepository chatSessionRepository;
    @Mock private ChatMessageRepository chatMessageRepository;

    private ChatHistoryService chatHistoryService;

    @BeforeEach
    void setUp() {
        chatHistoryService = new ChatHistoryService(chatSessionRepository, chatMessageRepository);
    }

    @Test
    void getOrCreateSession_existingSession_returnsIt() {
        UUID sessionId = UUID.randomUUID();
        ChatSession existing = ChatSession.builder().id(sessionId).userId(UUID.randomUUID()).build();
        when(chatSessionRepository.findById(sessionId)).thenReturn(Optional.of(existing));

        ChatSession result = chatHistoryService.getOrCreateSession(sessionId);

        assertThat(result.getId()).isEqualTo(sessionId);
        verify(chatSessionRepository, never()).save(any());
    }

    @Test
    void getOrCreateSession_newSession_createsWithoutManualId() {
        UUID sessionId = UUID.randomUUID();
        when(chatSessionRepository.findById(sessionId)).thenReturn(Optional.empty());
        when(chatSessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        chatHistoryService.getOrCreateSession(sessionId);

        ArgumentCaptor<ChatSession> captor = ArgumentCaptor.forClass(ChatSession.class);
        verify(chatSessionRepository).save(captor.capture());
        // ID must NOT be manually set — @GeneratedValue handles it
        assertThat(captor.getValue().getId()).isNull();
    }

    @Test
    void getOrCreateSession_nullSessionId_createsNew() {
        when(chatSessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        chatHistoryService.getOrCreateSession(null);

        verify(chatSessionRepository).save(any());
        verify(chatSessionRepository, never()).findById(any());
    }

    @Test
    void saveUserMessage_savesWithCorrectRole() {
        ChatSession session = ChatSession.builder()
                .id(UUID.randomUUID()).userId(UUID.randomUUID()).build();
        when(chatMessageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        chatHistoryService.saveUserMessage(session, "질문입니다");

        ArgumentCaptor<ChatMessage> captor = ArgumentCaptor.forClass(ChatMessage.class);
        verify(chatMessageRepository).save(captor.capture());
        assertThat(captor.getValue().getRole()).isEqualTo(ChatMessage.Role.USER);
        assertThat(captor.getValue().getContent()).isEqualTo("질문입니다");
    }

    @Test
    void saveAssistantMessage_savesWithSourcesAndConfidence() {
        ChatSession session = ChatSession.builder()
                .id(UUID.randomUUID()).userId(UUID.randomUUID()).build();
        when(chatMessageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<SourceInfo> sources = List.of(
                SourceInfo.builder()
                        .documentId(UUID.randomUUID()).filename("report.pdf")
                        .pageNumber(3).sectionTitle("재무").relevanceScore(0.9)
                        .build());

        chatHistoryService.saveAssistantMessage(session, "답변입니다", sources, 0.72);

        ArgumentCaptor<ChatMessage> captor = ArgumentCaptor.forClass(ChatMessage.class);
        verify(chatMessageRepository).save(captor.capture());
        ChatMessage saved = captor.getValue();
        assertThat(saved.getRole()).isEqualTo(ChatMessage.Role.ASSISTANT);
        assertThat(saved.getContent()).isEqualTo("답변입니다");
        assertThat(saved.getSourceChunks()).hasSize(1);
        assertThat(saved.getSourceChunks().get(0).getFilename()).isEqualTo("report.pdf");
        assertThat(saved.getConfidence()).isEqualTo(0.72);
    }

    @Test
    void persistConversation_savesSessionAndBothMessages() {
        UUID sessionId = UUID.randomUUID();
        ChatSession session = ChatSession.builder()
                .id(sessionId).userId(UUID.randomUUID()).build();
        when(chatSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(chatMessageRepository.save(any())).thenAnswer(inv -> {
            ChatMessage msg = inv.getArgument(0);
            // simulate DB assigning ID
            return ChatMessage.builder()
                    .id(UUID.randomUUID()).session(msg.getSession())
                    .role(msg.getRole()).content(msg.getContent())
                    .sourceChunks(msg.getSourceChunks()).confidence(msg.getConfidence())
                    .build();
        });

        ChatHistoryService.PersistResult result = chatHistoryService.persistConversation(
                sessionId, "매출이 얼마?", "150억원입니다.", List.of(), 0.8);

        assertThat(result.session().getId()).isEqualTo(sessionId);
        assertThat(result.assistantMessage().getRole()).isEqualTo(ChatMessage.Role.ASSISTANT);
        assertThat(result.assistantMessage().getContent()).isEqualTo("150억원입니다.");
        // 2 messages saved: user + assistant
        verify(chatMessageRepository, times(2)).save(any());
    }

    @Test
    void persistConversation_nullSessionId_createsNewSession() {
        ChatSession newSession = ChatSession.builder()
                .id(UUID.randomUUID()).userId(UUID.randomUUID()).build();
        when(chatSessionRepository.save(any())).thenReturn(newSession);
        when(chatMessageRepository.save(any())).thenAnswer(inv -> {
            ChatMessage msg = inv.getArgument(0);
            return ChatMessage.builder()
                    .id(UUID.randomUUID()).session(msg.getSession())
                    .role(msg.getRole()).content(msg.getContent()).build();
        });

        ChatHistoryService.PersistResult result = chatHistoryService.persistConversation(
                null, "질문", "답변", List.of(), 0.0);

        assertThat(result.session().getId()).isEqualTo(newSession.getId());
        // save called twice: once for createSession, once for updateSessionTitle
        verify(chatSessionRepository, atLeastOnce()).save(any());
    }

    @Test
    void getHistory_sessionNotFound_throwsException() {
        UUID sessionId = UUID.randomUUID();
        when(chatSessionRepository.findById(sessionId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatHistoryService.getHistory(sessionId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not found");
    }

    @Test
    void getHistory_returnsMessagesInOrder() {
        UUID sessionId = UUID.randomUUID();
        ChatSession session = ChatSession.builder()
                .id(sessionId).userId(UUID.randomUUID()).title("테스트 세션").build();
        when(chatSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        ChatMessage userMsg = ChatMessage.builder()
                .id(UUID.randomUUID()).session(session).role(ChatMessage.Role.USER)
                .content("질문").build();
        ChatMessage assistantMsg = ChatMessage.builder()
                .id(UUID.randomUUID()).session(session).role(ChatMessage.Role.ASSISTANT)
                .content("답변").confidence(0.8).build();

        when(chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId))
                .thenReturn(List.of(userMsg, assistantMsg));

        ChatHistoryResponse response = chatHistoryService.getHistory(sessionId);

        assertThat(response.getSessionId()).isEqualTo(sessionId);
        assertThat(response.getTitle()).isEqualTo("테스트 세션");
        assertThat(response.getMessages()).hasSize(2);
        assertThat(response.getMessages().get(0).getRole()).isEqualTo("USER");
        assertThat(response.getMessages().get(1).getRole()).isEqualTo("ASSISTANT");
    }
}
