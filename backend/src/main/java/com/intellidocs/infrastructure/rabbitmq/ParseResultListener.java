package com.intellidocs.infrastructure.rabbitmq;

import com.intellidocs.config.RabbitMQConfig;
import com.intellidocs.domain.document.dto.DocumentDto;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.document.service.DocumentSseEmitterService;
import com.intellidocs.infrastructure.elasticsearch.ElasticsearchIndexService;
import com.intellidocs.infrastructure.embedding.EmbeddingService;
import com.intellidocs.infrastructure.qdrant.QdrantIndexService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ParseResultListener {

    private final DocumentRepository documentRepository;
    private final DocumentSseEmitterService sseEmitterService;
    private final EmbeddingService embeddingService;
    private final QdrantIndexService qdrantIndexService;
    private final ElasticsearchIndexService esIndexService;
    private final ParseResultPersistenceService persistenceService;

    @RabbitListener(queues = RabbitMQConfig.PARSE_RESULT_QUEUE)
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
            persistenceService.handleFailure(document, result.getErrorMessage());
            return;
        }

        // Phase 1: DB 트랜잭션 — 청크 저장 + 상태 INDEXING으로 변경 (빠르게 커밋)
        persistenceService.saveChunksAndStartIndexing(document, result);

        // Phase 2: 외부 API 호출 — 트랜잭션 밖 (hang 시 DB 커넥션 점유 방지)
        indexDocument(document, result);

        // Phase 3: DB 트랜잭션 — 완료 상태 커밋
        persistenceService.completeIndexing(document, result);
    }

    /**
     * 외부 API 호출(임베딩, Qdrant, ES).
     * 트랜잭션 밖에서 실행되어 실패/타임아웃 시 DB 커넥션을 점유하지 않음.
     */
    private void indexDocument(Document document, ParsingMessage.ParseResult result) {
        // 임베딩 → Qdrant
        try {
            List<String> texts = result.getChunks().stream()
                    .map(ParsingMessage.ChunkData::getText)
                    .toList();
            List<float[]> embeddings = embeddingService.embedBatch(texts);

            if (!embeddings.isEmpty()) {
                qdrantIndexService.indexChunks(
                        document.getId(),
                        document.getOriginalFilename(),
                        document.getFileType() != null ? document.getFileType().name() : "UNKNOWN",
                        result.getChunks(),
                        embeddings
                );
                sseEmitterService.send(document.getId(),
                        DocumentDto.StatusEvent.builder()
                                .documentId(document.getId())
                                .status(DocumentStatus.INDEXING)
                                .message("벡터 인덱싱 완료.")
                                .progress(80)
                                .build());
            } else {
                log.warn("Embedding returned empty for document {} — vector search unavailable",
                        document.getId());
            }
        } catch (Exception e) {
            log.error("Vector indexing failed for document {} — proceeding without vector search",
                    document.getId(), e);
        }

        // ES 인덱싱
        try {
            esIndexService.indexChunks(
                    document.getId(),
                    document.getOriginalFilename(),
                    document.getFileType().name(),
                    result.getChunks(),
                    document.getCreatedAt()
            );
            sseEmitterService.send(document.getId(),
                    DocumentDto.StatusEvent.builder()
                            .documentId(document.getId())
                            .status(DocumentStatus.INDEXING)
                            .message("텍스트 인덱싱 완료.")
                            .progress(90)
                            .build());
        } catch (Exception e) {
            log.error("ES indexing failed for document {} — proceeding without text search",
                    document.getId(), e);
        }
    }
}
