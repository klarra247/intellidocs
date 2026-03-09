package com.intellidocs.infrastructure.qdrant;

import com.intellidocs.domain.search.dto.SearchRequest;
import com.intellidocs.domain.search.dto.SearchResult;
import com.intellidocs.infrastructure.embedding.EmbeddingService;
import io.qdrant.client.QdrantClient;
import io.qdrant.client.grpc.JsonWithInt;
import io.qdrant.client.grpc.Points.Condition;
import io.qdrant.client.grpc.Points.Filter;
import io.qdrant.client.grpc.Points.ScoredPoint;
import io.qdrant.client.grpc.Points.SearchPoints;
import io.qdrant.client.grpc.Points.WithPayloadSelector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.qdrant.client.ConditionFactory.matchKeyword;

@Slf4j
@Service
@RequiredArgsConstructor
public class QdrantSearchService {

    private final QdrantClient qdrantClient;
    private final EmbeddingService embeddingService;

    @Value("${app.qdrant.collection-name}")
    private String collectionName;

    /**
     * 쿼리 텍스트를 임베딩 후 Qdrant에서 코사인 유사도 상위 N개 검색
     */
    public List<SearchResult> search(String query, SearchRequest.Filters filters, int limit) {
        // 1. 쿼리 임베딩
        List<float[]> embeddings = embeddingService.embedBatch(List.of(query));
        if (embeddings.isEmpty()) {
            log.warn("[Qdrant Search] Embedding unavailable — skipping vector search");
            return List.of();
        }
        float[] vector = embeddings.get(0);

        // 2. 필터 구성 (documentIds → should OR)
        Filter filter = buildFilter(filters);

        // 3. 벡터 검색
        try {
            SearchPoints.Builder builder = SearchPoints.newBuilder()
                    .setCollectionName(collectionName)
                    .addAllVector(toFloatList(vector))
                    .setLimit(limit)
                    .setWithPayload(WithPayloadSelector.newBuilder().setEnable(true).build());

            // 필터 조건이 있을 때만 설정
            if (filter.getMustCount() > 0) {
                builder.setFilter(filter);
            }

            List<ScoredPoint> hits = qdrantClient.searchAsync(builder.build()).get();

            log.debug("[Qdrant Search] query='{}' hits={}", query, hits.size());
            return hits.stream()
                    .map(this::toSearchResult)
                    .toList();

        } catch (Exception e) {
            log.error("[Qdrant Search] Failed: {}", e.getMessage(), e);
            return List.of();
        }
    }

    // ── 필터 ──────────────────────────────────────────────────

    private Filter buildFilter(SearchRequest.Filters filters) {
        Filter.Builder fb = Filter.newBuilder();
        if (filters == null) return fb.build();

        // documentIds → OR-group wrapped in must
        if (filters.getDocumentIds() != null && !filters.getDocumentIds().isEmpty()) {
            Filter.Builder group = Filter.newBuilder();
            for (UUID docId : filters.getDocumentIds()) {
                group.addShould(matchKeyword("document_id", docId.toString()));
            }
            fb.addMust(Condition.newBuilder().setFilter(group.build()).build());
        }

        // workspaceId → exact match
        if (filters.getWorkspaceId() != null) {
            fb.addMust(matchKeyword("workspace_id", filters.getWorkspaceId().toString()));
        }

        // fileTypes → OR-group wrapped in must
        if (filters.getFileTypes() != null && !filters.getFileTypes().isEmpty()) {
            Filter.Builder group = Filter.newBuilder();
            for (String fileType : filters.getFileTypes()) {
                if (fileType == null || fileType.isBlank()) continue;
                group.addShould(matchKeyword("file_type", fileType.toUpperCase()));
            }
            fb.addMust(Condition.newBuilder().setFilter(group.build()).build());
        }

        return fb.build();
    }

    // ── 결과 변환 ─────────────────────────────────────────────

    private SearchResult toSearchResult(ScoredPoint point) {
        Map<String, JsonWithInt.Value> payload = point.getPayloadMap();

        String documentId = getStr(payload, "document_id");
        long chunkIndex   = getLong(payload, "chunk_index");
        String chunkId    = (documentId != null) ? documentId + "_" + chunkIndex : null;

        return SearchResult.builder()
                .chunkId(chunkId)
                .chunkIndex((int) chunkIndex)
                .documentId(documentId != null ? UUID.fromString(documentId) : null)
                .filename(getStr(payload, "filename"))
                .text(getStr(payload, "text"))
                .pageNumber((int) getLong(payload, "page_number"))
                .sectionTitle(getStr(payload, "section_title"))
                .chunkType(getStr(payload, "chunk_type"))
                .score(point.getScore())
                .build();
    }

    // ── 유틸리티 ──────────────────────────────────────────────

    private String getStr(Map<String, JsonWithInt.Value> payload, String key) {
        JsonWithInt.Value v = payload.get(key);
        if (v == null || v.getKindCase() != JsonWithInt.Value.KindCase.STRING_VALUE) return null;
        return v.getStringValue();
    }

    private long getLong(Map<String, JsonWithInt.Value> payload, String key) {
        JsonWithInt.Value v = payload.get(key);
        if (v == null || v.getKindCase() != JsonWithInt.Value.KindCase.INTEGER_VALUE) return 0L;
        return v.getIntegerValue();
    }

    private List<Float> toFloatList(float[] arr) {
        List<Float> list = new ArrayList<>(arr.length);
        for (float f : arr) list.add(f);
        return list;
    }
}
