package com.intellidocs.infrastructure.rabbitmq;

import com.intellidocs.config.RabbitMQConfig;
import com.intellidocs.domain.document.dto.DocumentDto;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentChunk;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.repository.DocumentChunkRepository;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.document.service.DocumentSseEmitterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class ParseResultListener {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentSseEmitterService sseEmitterService;
    // TODO: private final ElasticsearchIndexService esIndexService;
    // TODO: private final QdrantIndexService qdrantIndexService;

    @RabbitListener(queues = RabbitMQConfig.PARSE_RESULT_QUEUE)
    @Transactional
    public void handleParseResult(ParsingMessage.ParseResult result) {
        log.info("Received parse result for document: {}, success: {}",
                result.getDocumentId(), result.isSuccess());

        Document document = documentRepository.findById(result.getDocumentId())
                .orElse(null);
        if (document == null) {
            log.warn("Document not found: {}", result.getDocumentId());
            return;
        }

        if (!result.isSuccess()) {
            document.fail(result.getErrorMessage());
            documentRepository.save(document);
            sseEmitterService.send(document.getId(),
                    DocumentDto.StatusEvent.builder()
                            .documentId(document.getId())
                            .status(DocumentStatus.FAILED)
                            .message("파싱 실패: " + result.getErrorMessage())
                            .progress(0)
                            .build());
            sseEmitterService.complete(document.getId());
            return;
        }

        // 1. 인덱싱 단계 시작
        document.startIndexing();
        documentRepository.save(document);
        sseEmitterService.send(document.getId(),
                DocumentDto.StatusEvent.builder()
                        .documentId(document.getId())
                        .status(DocumentStatus.INDEXING)
                        .message("파싱 완료. 인덱싱을 시작합니다.")
                        .progress(50)
                        .build());

        // 2. 청크 메타데이터 DB 저장
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

        // 3. TODO: Embedding 생성 → Qdrant 저장
        // 4. TODO: ES 인덱싱

        // 5. 완료
        document.completeIndexing(
                result.getTotalPages(),
                result.getChunks().size()
        );
        documentRepository.save(document);

        sseEmitterService.send(document.getId(),
                DocumentDto.StatusEvent.builder()
                        .documentId(document.getId())
                        .status(DocumentStatus.INDEXED)
                        .message("인덱싱 완료!")
                        .progress(100)
                        .build());
        sseEmitterService.complete(document.getId());

        log.info("Document indexed successfully: {}, chunks: {}",
                document.getId(), result.getChunks().size());
    }
}