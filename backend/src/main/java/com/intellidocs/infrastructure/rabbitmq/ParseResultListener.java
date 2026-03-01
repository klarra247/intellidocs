package com.intellidocs.infrastructure.rabbitmq;

import com.intellidocs.config.RabbitMQConfig;
import com.intellidocs.domain.document.dto.DocumentDto;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentChunk;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.repository.DocumentChunkRepository;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.document.service.DocumentSseEmitterService;
import com.intellidocs.infrastructure.elasticsearch.ElasticsearchIndexService;
import com.intellidocs.infrastructure.embedding.EmbeddingService;
import com.intellidocs.infrastructure.qdrant.QdrantIndexService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ParseResultListener {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentSseEmitterService sseEmitterService;
    private final EmbeddingService embeddingService;
    private final QdrantIndexService qdrantIndexService;
    private final ElasticsearchIndexService esIndexService;

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

        // 3. 임베딩 생성 → Qdrant 저장
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
            }
        } catch (Exception e) {
            log.error("Vector indexing failed for document {} — proceeding without vector search",
                    document.getId(), e);
        }

        // 4. ES 인덱싱
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