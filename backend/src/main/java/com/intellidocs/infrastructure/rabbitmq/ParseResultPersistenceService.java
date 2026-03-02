package com.intellidocs.infrastructure.rabbitmq;

import com.intellidocs.domain.document.dto.DocumentDto;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentChunk;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.repository.DocumentChunkRepository;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.document.service.DocumentSseEmitterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParseResultPersistenceService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentSseEmitterService sseEmitterService;

    @Transactional
    public void handleFailure(Document document, String errorMessage) {
        document.fail(errorMessage);
        documentRepository.save(document);
        sseEmitterService.send(document.getId(),
                DocumentDto.StatusEvent.builder()
                        .documentId(document.getId())
                        .status(DocumentStatus.FAILED)
                        .message("파싱 실패: " + errorMessage)
                        .progress(0)
                        .build());
        sseEmitterService.complete(document.getId());
    }

    @Transactional
    public void saveChunksAndStartIndexing(Document document, ParsingMessage.ParseResult result) {
        document.startIndexing();
        documentRepository.save(document);
        sseEmitterService.send(document.getId(),
                DocumentDto.StatusEvent.builder()
                        .documentId(document.getId())
                        .status(DocumentStatus.INDEXING)
                        .message("파싱 완료. 인덱싱을 시작합니다.")
                        .progress(50)
                        .build());

        for (ParsingMessage.ChunkData chunkData : result.getChunks()) {
            DocumentChunk chunk = DocumentChunk.builder()
                    .document(document)
                    .chunkIndex(chunkData.getChunkIndex())
                    .pageNumber(chunkData.getPageNumber())
                    .tokenCount(chunkData.getTokenCount())
                    .sectionTitle(chunkData.getSectionTitle())
                    .chunkType(DocumentChunk.ChunkType.valueOf(chunkData.getChunkType()))
                    .build();
            documentChunkRepository.save(chunk);
        }

        log.info("Saved {} chunks for document {}", result.getChunks().size(), document.getId());
    }

    @Transactional
    public void completeIndexing(Document document, ParsingMessage.ParseResult result) {
        Document managed = documentRepository.findById(document.getId()).orElse(null);
        if (managed == null) return;

        managed.completeIndexing(
                result.getTotalPages(),
                result.getChunks().size()
        );
        documentRepository.save(managed);

        sseEmitterService.send(managed.getId(),
                DocumentDto.StatusEvent.builder()
                        .documentId(managed.getId())
                        .status(DocumentStatus.INDEXED)
                        .message("인덱싱 완료!")
                        .progress(100)
                        .build());
        sseEmitterService.complete(managed.getId());

        log.info("Document indexed successfully: {}, chunks: {}",
                managed.getId(), result.getChunks().size());
    }
}
