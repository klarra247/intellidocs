package com.intellidocs.domain.document.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.document.dto.ChunkDto;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentChunk;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.entity.FileType;
import com.intellidocs.domain.document.repository.DocumentChunkRepository;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.infrastructure.qdrant.QdrantChunkRetrievalService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChunkServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private DocumentChunkRepository chunkRepository;

    @Mock
    private QdrantChunkRetrievalService qdrantChunkRetrievalService;

    @InjectMocks
    private ChunkService chunkService;

    private static final UUID DOC_ID = UUID.randomUUID();

    private Document indexedDocument() {
        return Document.builder()
                .id(DOC_ID)
                .userId(UUID.randomUUID())
                .filename("test.pdf")
                .originalFilename("test.pdf")
                .fileType(FileType.PDF)
                .fileSize(1024L)
                .storagePath("/uploads/test.pdf")
                .status(DocumentStatus.INDEXED)
                .build();
    }

    private DocumentChunk chunk(int index) {
        return DocumentChunk.builder()
                .id(UUID.randomUUID())
                .document(indexedDocument())
                .chunkIndex(index)
                .pageNumber(1)
                .tokenCount(50)
                .sectionTitle("Section")
                .chunkType(DocumentChunk.ChunkType.TEXT)
                .build();
    }

    @Test
    void getChunk_success() {
        Document doc = indexedDocument();
        DocumentChunk ch = chunk(0);
        when(documentRepository.findById(DOC_ID)).thenReturn(Optional.of(doc));
        when(chunkRepository.findByDocumentIdAndChunkIndex(DOC_ID, 0)).thenReturn(Optional.of(ch));
        when(qdrantChunkRetrievalService.getChunkText(DOC_ID, 0)).thenReturn(Optional.of("hello"));

        ChunkDto.Response result = chunkService.getChunk(DOC_ID, 0);

        assertThat(result.getText()).isEqualTo("hello");
        assertThat(result.getChunkIndex()).isEqualTo(0);
        assertThat(result.getWarning()).isNull();
    }

    @Test
    void getChunk_negativeIndex_throws() {
        assertThatThrownBy(() -> chunkService.getChunk(DOC_ID, -1))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("유효하지 않은");
    }

    @Test
    void getChunk_documentNotIndexed_throws() {
        Document doc = Document.builder()
                .id(DOC_ID)
                .userId(UUID.randomUUID())
                .filename("test.pdf")
                .originalFilename("test.pdf")
                .fileType(FileType.PDF)
                .fileSize(1024L)
                .storagePath("/uploads/test.pdf")
                .status(DocumentStatus.PARSING)
                .build();
        when(documentRepository.findById(DOC_ID)).thenReturn(Optional.of(doc));

        assertThatThrownBy(() -> chunkService.getChunk(DOC_ID, 0))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("DOCUMENT_NOT_READY");
    }

    @Test
    void getChunk_qdrantTextMissing_returnsWarning() {
        Document doc = indexedDocument();
        DocumentChunk ch = chunk(0);
        when(documentRepository.findById(DOC_ID)).thenReturn(Optional.of(doc));
        when(chunkRepository.findByDocumentIdAndChunkIndex(DOC_ID, 0)).thenReturn(Optional.of(ch));
        when(qdrantChunkRetrievalService.getChunkText(DOC_ID, 0)).thenReturn(Optional.empty());

        ChunkDto.Response result = chunkService.getChunk(DOC_ID, 0);

        assertThat(result.getText()).isNull();
        assertThat(result.getWarning()).isNotNull();
    }

    @Test
    void getChunks_deduplication() {
        Document doc = indexedDocument();
        DocumentChunk ch0 = chunk(0);
        when(documentRepository.findById(DOC_ID)).thenReturn(Optional.of(doc));
        when(chunkRepository.findByDocumentIdAndChunkIndexIn(eq(DOC_ID), anyList()))
                .thenReturn(List.of(ch0));
        when(qdrantChunkRetrievalService.getChunkTexts(eq(DOC_ID), anyList()))
                .thenReturn(Map.of(0, "text"));

        // 중복 indices
        ChunkDto.BulkResponse result = chunkService.getChunks(DOC_ID, List.of(0, 0, 0));

        assertThat(result.getChunks()).hasSize(1);
        assertThat(result.getNotFound()).isEmpty();
    }

    @Test
    void getChunks_tooMany_throws() {
        List<Integer> tooMany = java.util.stream.IntStream.range(0, 21).boxed().toList();

        assertThatThrownBy(() -> chunkService.getChunks(DOC_ID, tooMany))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("TOO_MANY_CHUNKS");
    }

    @Test
    void getChunks_emptyIndices_throws() {
        assertThatThrownBy(() -> chunkService.getChunks(DOC_ID, List.of()))
                .isInstanceOf(BusinessException.class);
    }
}
