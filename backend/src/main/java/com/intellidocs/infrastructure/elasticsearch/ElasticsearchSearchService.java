package com.intellidocs.infrastructure.elasticsearch;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.intellidocs.domain.search.dto.SearchRequest;
import com.intellidocs.domain.search.dto.SearchResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ElasticsearchSearchService {

    private final ElasticsearchClient esClient;

    @Value("${app.elasticsearch.index-name}")
    private String indexName;

    /**
     * BM25 full-text search against the text field with optional filters.
     */
    public List<SearchResult> search(String query, SearchRequest.Filters filters, int limit) {
        try {
            BoolQuery.Builder boolQ = new BoolQuery.Builder()
                    .must(m -> m.match(ma -> ma.field("text").query(query)));

            applyFilters(boolQ, filters);

            SearchResponse<ObjectNode> response = esClient.search(s -> s
                    .index(indexName)
                    .query(q -> q.bool(boolQ.build()))
                    .size(limit),
                    ObjectNode.class
            );

            List<SearchResult> results = new ArrayList<>();
            for (Hit<ObjectNode> hit : response.hits().hits()) {
                results.add(toSearchResult(hit));
            }
            log.debug("[ES Search] query='{}' hits={}", query, results.size());
            return results;

        } catch (Exception e) {
            log.error("[ES Search] Failed: {}", e.getMessage(), e);
            return List.of();
        }
    }

    // ── 필터 ──────────────────────────────────────────────────

    private void applyFilters(BoolQuery.Builder boolQ, SearchRequest.Filters filters) {
        if (filters == null) return;

        // document_id IN [...] → terms filter
        if (filters.getDocumentIds() != null && !filters.getDocumentIds().isEmpty()) {
            List<String> ids = filters.getDocumentIds().stream()
                    .map(UUID::toString)
                    .toList();
            boolQ.filter(f -> f.terms(t -> t
                    .field("document_id")
                    .terms(tv -> tv.value(ids.stream()
                            .map(co.elastic.clients.elasticsearch._types.FieldValue::of)
                            .toList()))
            ));
        }

        // workspace_id → term filter
        if (filters.getWorkspaceId() != null) {
            boolQ.filter(f -> f.term(t -> t
                    .field("workspace_id")
                    .value(filters.getWorkspaceId().toString())
            ));
        }

        // file_type IN [...] → terms filter
        if (filters.getFileTypes() != null && !filters.getFileTypes().isEmpty()) {
            boolQ.filter(f -> f.terms(t -> t
                    .field("file_type")
                    .terms(tv -> tv.value(filters.getFileTypes().stream()
                            .map(co.elastic.clients.elasticsearch._types.FieldValue::of)
                            .toList()))
            ));
        }

        // date range filter on created_at
        if (filters.getDateRange() != null) {
            SearchRequest.DateRange dr = filters.getDateRange();
            if (dr.getFrom() != null || dr.getTo() != null) {
                boolQ.filter(f -> f.range(r -> {
                    var rb = r.date(d -> {
                        var db = d.field("created_at");
                        if (dr.getFrom() != null) db = db.gte(dr.getFrom().toString());
                        if (dr.getTo()   != null) db = db.lte(dr.getTo().toString());
                        return db;
                    });
                    return rb;
                }));
            }
        }
    }

    // ── 결과 변환 ─────────────────────────────────────────────

    private SearchResult toSearchResult(Hit<ObjectNode> hit) {
        ObjectNode src = hit.source();
        String documentId = src != null && src.hasNonNull("document_id")
                ? src.get("document_id").asText() : null;

        String chunkId = src != null && src.hasNonNull("chunk_id") ? src.get("chunk_id").asText() : hit.id();
        Integer chunkIndex = parseChunkIndex(src, chunkId);

        return SearchResult.builder()
                .chunkId(chunkId)
                .chunkIndex(chunkIndex)
                .documentId(documentId != null ? UUID.fromString(documentId) : null)
                .filename(src != null && src.hasNonNull("filename") ? src.get("filename").asText() : null)
                .text(src != null && src.hasNonNull("text") ? src.get("text").asText() : null)
                .pageNumber(src != null && src.hasNonNull("page_number") ? src.get("page_number").asInt() : 0)
                .sectionTitle(src != null && src.hasNonNull("section_title") ? src.get("section_title").asText() : null)
                .chunkType(src != null && src.hasNonNull("chunk_type") ? src.get("chunk_type").asText() : null)
                .score(hit.score() != null ? hit.score() : 0.0)
                .build();
    }

    /**
     * Extract chunk_index from the ES document field, falling back to parsing from chunkId string.
     * chunkId format: "docId_chunkIndex" (e.g. "550e8400-e29b-41d4-a716-446655440000_3")
     */
    private Integer parseChunkIndex(ObjectNode src, String chunkId) {
        // Try direct field first
        if (src != null && src.hasNonNull("chunk_index")) {
            return src.get("chunk_index").asInt();
        }
        // Fallback: parse from chunkId (last segment after underscore)
        if (chunkId != null && chunkId.contains("_")) {
            try {
                String lastSegment = chunkId.substring(chunkId.lastIndexOf('_') + 1);
                return Integer.parseInt(lastSegment);
            } catch (NumberFormatException e) {
                log.warn("[ES Search] Could not parse chunkIndex from chunkId: {}", chunkId);
            }
        }
        return null;
    }
}
