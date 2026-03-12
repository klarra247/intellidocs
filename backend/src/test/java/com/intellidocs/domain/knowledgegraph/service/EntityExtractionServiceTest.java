package com.intellidocs.domain.knowledgegraph.service;

import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentChunk;
import com.intellidocs.domain.document.repository.DocumentChunkRepository;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.knowledgegraph.entity.EntityType;
import com.intellidocs.domain.knowledgegraph.entity.KgEntity;
import com.intellidocs.domain.knowledgegraph.repository.KgEntityRepository;
import com.intellidocs.infrastructure.qdrant.QdrantChunkRetrievalService;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EntityExtractionServiceTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private DocumentChunkRepository chunkRepository;
    @Mock private KgEntityRepository kgEntityRepository;
    @Mock private QdrantChunkRetrievalService qdrantService;
    @Mock private ChatLanguageModel chatLanguageModel;

    private EntityNormalizationService normalizationService;
    private EntityExtractionService service;

    @BeforeEach
    void setUp() {
        normalizationService = new EntityNormalizationService();
        service = new EntityExtractionService(
                documentRepository, chunkRepository, kgEntityRepository,
                qdrantService, chatLanguageModel, normalizationService);
    }

    private ChatResponse mockLlmResponse(String text) {
        ChatResponse cr = mock(ChatResponse.class);
        AiMessage am = mock(AiMessage.class);
        when(am.text()).thenReturn(text);
        when(cr.aiMessage()).thenReturn(am);
        return cr;
    }

    @Test
    void 엔티티_추출_성공() {
        UUID docId = UUID.randomUUID();
        UUID wsId = UUID.randomUUID();
        Document doc = mock(Document.class);
        when(doc.getId()).thenReturn(docId);
        when(doc.getWorkspaceId()).thenReturn(wsId);
        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));

        DocumentChunk chunk = mock(DocumentChunk.class);
        when(chunk.getChunkIndex()).thenReturn(0);
        when(chunk.getPageNumber()).thenReturn(1);
        when(chunk.getSectionTitle()).thenReturn("매출 현황");
        when(chunkRepository.findByDocumentIdOrderByChunkIndex(docId)).thenReturn(List.of(chunk));
        when(qdrantService.getChunkTexts(eq(docId), anyList()))
                .thenReturn(Map.of(0, "테크스타의 2024년 매출액은 452억원입니다."));

        String llmResponse = """
                [
                  {"name": "테크스타", "entity_type": "COMPANY", "value": null, "period": null},
                  {"name": "매출액", "entity_type": "METRIC", "value": "452억원", "period": "2024년"},
                  {"name": "452억원", "entity_type": "AMOUNT", "value": "452억원", "period": "2024년"}
                ]
                """;
        ChatResponse cr = mockLlmResponse(llmResponse);
        when(chatLanguageModel.chat(any(ChatRequest.class))).thenReturn(cr);
        when(kgEntityRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        service.extractEntities(docId);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<KgEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(kgEntityRepository).saveAll(captor.capture());
        List<KgEntity> saved = captor.getValue();
        assertThat(saved).hasSize(3);
        assertThat(saved).anyMatch(e -> e.getName().equals("테크스타") && e.getEntityType() == EntityType.COMPANY);
    }

    @Test
    void LLM_응답이_유효하지_않은_JSON이면_빈_결과() {
        UUID docId = UUID.randomUUID();
        Document doc = mock(Document.class);
        when(doc.getId()).thenReturn(docId);
        when(doc.getWorkspaceId()).thenReturn(UUID.randomUUID());
        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));

        DocumentChunk chunk = mock(DocumentChunk.class);
        when(chunk.getChunkIndex()).thenReturn(0);
        when(chunk.getSectionTitle()).thenReturn("test");
        when(chunkRepository.findByDocumentIdOrderByChunkIndex(docId)).thenReturn(List.of(chunk));
        when(qdrantService.getChunkTexts(eq(docId), anyList())).thenReturn(Map.of(0, "text"));
        ChatResponse cr = mockLlmResponse("이것은 JSON이 아닙니다");
        when(chatLanguageModel.chat(any(ChatRequest.class))).thenReturn(cr);

        service.extractEntities(docId);

        verify(kgEntityRepository, never()).saveAll(anyList());
    }

    @Test
    void 환각_엔티티_필터링_청크에_없는_이름은_드롭() {
        UUID docId = UUID.randomUUID();
        Document doc = mock(Document.class);
        when(doc.getId()).thenReturn(docId);
        when(doc.getWorkspaceId()).thenReturn(UUID.randomUUID());
        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));

        DocumentChunk chunk = mock(DocumentChunk.class);
        when(chunk.getChunkIndex()).thenReturn(0);
        when(chunk.getPageNumber()).thenReturn(1);
        when(chunk.getSectionTitle()).thenReturn("sec");
        when(chunkRepository.findByDocumentIdOrderByChunkIndex(docId)).thenReturn(List.of(chunk));
        when(qdrantService.getChunkTexts(eq(docId), anyList()))
                .thenReturn(Map.of(0, "테크스타의 매출액은 100억원"));

        String llmResponse = """
                [
                  {"name": "테크스타", "entity_type": "COMPANY", "value": null, "period": null},
                  {"name": "허깅페이스", "entity_type": "COMPANY", "value": null, "period": null}
                ]
                """;
        ChatResponse cr = mockLlmResponse(llmResponse);
        when(chatLanguageModel.chat(any(ChatRequest.class))).thenReturn(cr);
        when(kgEntityRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        service.extractEntities(docId);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<KgEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(kgEntityRepository).saveAll(captor.capture());
        List<KgEntity> saved = captor.getValue();
        assertThat(saved).hasSize(1);
        assertThat(saved.get(0).getName()).isEqualTo("테크스타");
    }

    @Test
    void 중복_엔티티_병합_같은_normalizedName과_entityType() {
        UUID docId = UUID.randomUUID();
        Document doc = mock(Document.class);
        when(doc.getId()).thenReturn(docId);
        when(doc.getWorkspaceId()).thenReturn(UUID.randomUUID());
        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));

        DocumentChunk chunk1 = mock(DocumentChunk.class);
        when(chunk1.getChunkIndex()).thenReturn(0);
        when(chunk1.getPageNumber()).thenReturn(1);
        when(chunk1.getSectionTitle()).thenReturn("sec1");
        DocumentChunk chunk2 = mock(DocumentChunk.class);
        when(chunk2.getChunkIndex()).thenReturn(1);
        when(chunk2.getPageNumber()).thenReturn(2);
        when(chunk2.getSectionTitle()).thenReturn("sec2");
        when(chunkRepository.findByDocumentIdOrderByChunkIndex(docId)).thenReturn(List.of(chunk1, chunk2));
        when(qdrantService.getChunkTexts(eq(docId), anyList()))
                .thenReturn(Map.of(0, "매출액은 100억", 1, "매출은 200억"));

        // Both chunks are in same batch (size 5), so single LLM call with combined text
        String llmResponse = """
                [
                  {"name": "매출액", "entity_type": "METRIC", "value": "100억", "period": null},
                  {"name": "매출", "entity_type": "METRIC", "value": "200억", "period": null}
                ]
                """;
        ChatResponse cr = mockLlmResponse(llmResponse);
        when(chatLanguageModel.chat(any(ChatRequest.class))).thenReturn(cr);
        when(kgEntityRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        service.extractEntities(docId);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<KgEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(kgEntityRepository).saveAll(captor.capture());
        List<KgEntity> saved = captor.getValue();
        // "매출액" normalizes to "매출액", "매출" also normalizes to "매출액" via EntityNormalizationService
        // Both have METRIC type, so deduplication should keep only 1
        assertThat(saved).hasSize(1);
        assertThat(saved.get(0).getNormalizedName()).isEqualTo("매출액");
    }
}
