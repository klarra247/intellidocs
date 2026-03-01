package com.intellidocs.infrastructure.elasticsearch;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.ElasticsearchException;
import co.elastic.clients.elasticsearch.core.BulkResponse;
import com.intellidocs.infrastructure.rabbitmq.ParsingMessage;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ElasticsearchIndexService {

    private final ElasticsearchClient esClient;

    @Value("${app.elasticsearch.index-name}")
    private String indexName;

    /**
     * Ensures the index exists at startup.
     * Tries nori analyzer first; falls back to standard if the plugin is not installed.
     */
    @PostConstruct
    public void initIndex() {
        try {
            boolean exists = esClient.indices().exists(e -> e.index(indexName)).value();
            if (exists) {
                log.info("[ES] Index '{}' already exists", indexName);
                return;
            }
            try {
                createIndexWithNori();
                log.info("[ES] Created index '{}' with nori analyzer", indexName);
            } catch (ElasticsearchException | IOException e) {
                log.warn("[ES] nori plugin unavailable ({}), falling back to standard analyzer", e.getMessage());
                createIndexWithStandard();
                log.info("[ES] Created index '{}' with standard analyzer", indexName);
            }
        } catch (Exception e) {
            log.error("[ES] Failed to initialize index '{}' — text search will be unavailable: {}",
                    indexName, e.getMessage());
        }
    }

    private void createIndexWithNori() throws IOException {
        esClient.indices().create(c -> c
                .index(indexName)
                .settings(s -> s
                        .analysis(a -> a
                                .analyzer("korean", an -> an
                                        .custom(ca -> ca.tokenizer("nori_tokenizer"))
                                )
                        )
                )
                .mappings(m -> m
                        .properties("chunk_id",      p -> p.keyword(k -> k))
                        .properties("document_id",   p -> p.keyword(k -> k))
                        .properties("filename",      p -> p.text(t -> t.fields("keyword", f -> f.keyword(k -> k))))
                        .properties("text",          p -> p.text(t -> t.analyzer("korean")))
                        .properties("page_number",   p -> p.integer(i -> i))
                        .properties("section_title", p -> p.text(t -> t))
                        .properties("file_type",     p -> p.keyword(k -> k))
                        .properties("chunk_type",    p -> p.keyword(k -> k))
                        .properties("created_at",    p -> p.date(d -> d))
                )
        );
    }

    private void createIndexWithStandard() throws IOException {
        esClient.indices().create(c -> c
                .index(indexName)
                .mappings(m -> m
                        .properties("chunk_id",      p -> p.keyword(k -> k))
                        .properties("document_id",   p -> p.keyword(k -> k))
                        .properties("filename",      p -> p.text(t -> t.fields("keyword", f -> f.keyword(k -> k))))
                        .properties("text",          p -> p.text(t -> t))
                        .properties("page_number",   p -> p.integer(i -> i))
                        .properties("section_title", p -> p.text(t -> t))
                        .properties("file_type",     p -> p.keyword(k -> k))
                        .properties("chunk_type",    p -> p.keyword(k -> k))
                        .properties("created_at",    p -> p.date(d -> d))
                )
        );
    }

    /**
     * Bulk-indexes all chunks for a document.
     * Document ID in ES = "{documentId}_{chunkIndex}" for deterministic upsert.
     */
    public void indexChunks(
            UUID documentId,
            String originalFilename,
            String fileType,
            List<ParsingMessage.ChunkData> chunks,
            LocalDateTime createdAt
    ) {
        if (chunks.isEmpty()) return;

        try {
            var bulk = new co.elastic.clients.elasticsearch.core.BulkRequest.Builder();

            for (ParsingMessage.ChunkData chunk : chunks) {
                final String esDocId = documentId + "_" + chunk.getChunkIndex();
                final Map<String, Object> doc = buildDoc(documentId, originalFilename, fileType, chunk, createdAt);
                bulk.operations(op -> op
                        .index(idx -> idx
                                .index(indexName)
                                .id(esDocId)
                                .document(doc)
                        )
                );
            }

            BulkResponse response = esClient.bulk(bulk.build());
            if (response.errors()) {
                response.items().stream()
                        .filter(item -> item.error() != null)
                        .forEach(item -> log.warn("[ES] Chunk index error: {}", item.error().reason()));
            }
            log.info("[ES] Indexed {} chunks for document {}", chunks.size(), documentId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to index chunks to ES for document " + documentId, e);
        }
    }

    /**
     * Deletes all chunks belonging to a document via deleteByQuery on the document_id field.
     */
    public void deleteByDocumentId(UUID documentId) {
        try {
            esClient.deleteByQuery(d -> d
                    .index(indexName)
                    .query(q -> q
                            .term(t -> t
                                    .field("document_id")
                                    .value(documentId.toString())
                            )
                    )
            );
            log.info("[ES] Deleted chunks for document {}", documentId);
        } catch (Exception e) {
            log.error("[ES] Failed to delete chunks for document {}: {}", documentId, e.getMessage(), e);
        }
    }

    private Map<String, Object> buildDoc(
            UUID documentId,
            String originalFilename,
            String fileType,
            ParsingMessage.ChunkData chunk,
            LocalDateTime createdAt
    ) {
        Map<String, Object> doc = new HashMap<>();
        doc.put("chunk_id",      documentId + "_" + chunk.getChunkIndex());
        doc.put("document_id",   documentId.toString());
        doc.put("filename",      originalFilename);
        doc.put("text",          chunk.getText());
        doc.put("page_number",   chunk.getPageNumber());
        doc.put("section_title", chunk.getSectionTitle());
        doc.put("file_type",     fileType);
        doc.put("chunk_type",    chunk.getChunkType());
        doc.put("created_at",    createdAt != null ? createdAt.toString() : null);
        return doc;
    }
}
