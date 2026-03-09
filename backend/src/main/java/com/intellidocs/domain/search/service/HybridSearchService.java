package com.intellidocs.domain.search.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidocs.common.WorkspaceContext;
import com.intellidocs.domain.search.dto.SearchRequest;
import com.intellidocs.domain.search.dto.SearchResponse;
import com.intellidocs.domain.search.dto.SearchResult;
import com.intellidocs.infrastructure.elasticsearch.ElasticsearchSearchService;
import com.intellidocs.infrastructure.qdrant.QdrantSearchService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class HybridSearchService {

    private final QdrantSearchService qdrantSearchService;
    private final ElasticsearchSearchService elasticsearchSearchService;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;
    private final Executor searchExecutor;

    public HybridSearchService(
            QdrantSearchService qdrantSearchService,
            ElasticsearchSearchService elasticsearchSearchService,
            StringRedisTemplate stringRedisTemplate,
            ObjectMapper objectMapper,
            @Qualifier("searchExecutor") Executor searchExecutor
    ) {
        this.qdrantSearchService = qdrantSearchService;
        this.elasticsearchSearchService = elasticsearchSearchService;
        this.stringRedisTemplate = stringRedisTemplate;
        this.objectMapper = objectMapper;
        this.searchExecutor = searchExecutor;
    }

    @Value("${app.search.vector-weight:0.6}")
    private double vectorWeight;

    @Value("${app.search.bm25-weight:0.4}")
    private double bm25Weight;

    @Value("${app.search.rrf-k:60}")
    private int rrfK;

    @Value("${app.search.default-limit:10}")
    private int defaultLimit;

    private static final String CACHE_PREFIX = "search:";

    /**
     * Runs vector and BM25 searches in parallel, then fuses with RRF.
     * If either source's future throws, the exception propagates to the caller.
     * Individual source failures are handled inside QdrantSearchService and ElasticsearchSearchService
     * (they each catch exceptions and return empty lists).
     */
    public SearchResponse search(SearchRequest request) {
        // Auto-inject workspaceId from context if not already set
        UUID contextWorkspaceId = WorkspaceContext.getCurrentWorkspaceId();
        if (contextWorkspaceId != null) {
            SearchRequest.Filters filters = request.getFilters();
            if (filters == null) {
                filters = SearchRequest.Filters.builder()
                        .workspaceId(contextWorkspaceId)
                        .build();
            } else if (filters.getWorkspaceId() == null) {
                filters = SearchRequest.Filters.builder()
                        .documentIds(filters.getDocumentIds())
                        .fileTypes(filters.getFileTypes())
                        .dateRange(filters.getDateRange())
                        .workspaceId(contextWorkspaceId)
                        .build();
            }
            request = SearchRequest.builder()
                    .query(request.getQuery())
                    .filters(filters)
                    .limit(request.getLimit())
                    .build();
        }

        final SearchRequest effectiveRequest = request;
        String cacheKey = buildCacheKey(effectiveRequest);

        // 1. Cache read — skip silently on Redis error
        try {
            String cached = stringRedisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                log.debug("[Cache] HIT key={}", cacheKey);
                return objectMapper.readValue(cached, new TypeReference<SearchResponse>() {});
            }
        } catch (Exception e) {
            log.warn("[Cache] Read failed (Redis down?), proceeding without cache: {}", e.getMessage());
        }

        // 2. Execute search
        // Measures total wall time: embedding + Qdrant gRPC + ES HTTP + RRF fusion
        long start = System.currentTimeMillis();
        int limit = effectiveRequest.getLimit() != null ? effectiveRequest.getLimit() : defaultLimit;

        // Fetch more candidates than limit so RRF has room to re-rank
        int candidateLimit = Math.min(limit * 3, 50);

        CompletableFuture<List<SearchResult>> vectorFuture = CompletableFuture.supplyAsync(() ->
                qdrantSearchService.search(effectiveRequest.getQuery(), effectiveRequest.getFilters(), candidateLimit),
                searchExecutor)
                .orTimeout(5, TimeUnit.SECONDS)
                .exceptionally(ex -> {
                    log.warn("[Hybrid] Vector search failed/timed out: {}", ex.getMessage());
                    return Collections.emptyList();
                });

        CompletableFuture<List<SearchResult>> bm25Future = CompletableFuture.supplyAsync(() ->
                elasticsearchSearchService.search(effectiveRequest.getQuery(), effectiveRequest.getFilters(), candidateLimit),
                searchExecutor)
                .orTimeout(5, TimeUnit.SECONDS)
                .exceptionally(ex -> {
                    log.warn("[Hybrid] BM25 search failed/timed out: {}", ex.getMessage());
                    return Collections.emptyList();
                });

        List<SearchResult> vectorResults = vectorFuture.join();
        List<SearchResult> bm25Results   = bm25Future.join();

        log.debug("[Hybrid] vector={} bm25={}", vectorResults.size(), bm25Results.size());

        List<SearchResult> fused = rrf(vectorResults, bm25Results);
        List<SearchResult> page  = fused.subList(0, Math.min(limit, fused.size()));

        SearchResponse response = SearchResponse.builder()
                .results(page)
                .totalResults(page.size())
                .elapsedMs(System.currentTimeMillis() - start)
                .vectorHits(vectorResults.size())
                .bm25Hits(bm25Results.size())
                .appliedFilters(effectiveRequest.getFilters())
                .build();

        // 3. Cache write — skip silently on Redis error
        try {
            String json = objectMapper.writeValueAsString(response);
            stringRedisTemplate.opsForValue().set(
                    cacheKey, json,
                    java.time.Duration.ofMinutes(10)
            );
            log.debug("[Cache] WRITE key={}", cacheKey);
        } catch (Exception e) {
            log.warn("[Cache] Write failed (Redis down?): {}", e.getMessage());
        }

        return response;
    }

    private String buildCacheKey(SearchRequest request) {
        try {
            // Normalize filters to a deterministic representation:
            // - Sort documentIds and fileTypes alphabetically so [A,B] and [B,A] produce the same key
            // - Use TreeMap so fields are always serialized in alphabetical order
            java.util.Map<String, Object> normalizedFilters = new java.util.TreeMap<>();
            SearchRequest.Filters f = request.getFilters();
            if (f != null) {
                if (f.getDocumentIds() != null && !f.getDocumentIds().isEmpty()) {
                    normalizedFilters.put("documentIds", f.getDocumentIds().stream()
                            .map(UUID::toString).sorted().toList());
                }
                if (f.getFileTypes() != null && !f.getFileTypes().isEmpty()) {
                    normalizedFilters.put("fileTypes", f.getFileTypes().stream()
                            .filter(s -> s != null && !s.isBlank())
                            .map(String::toUpperCase).sorted().toList());
                }
                if (f.getDateRange() != null) {
                    normalizedFilters.put("dateRange", objectMapper.writeValueAsString(f.getDateRange()));
                }
                if (f.getWorkspaceId() != null) {
                    normalizedFilters.put("workspaceId", f.getWorkspaceId().toString());
                }
            }

            String raw = request.getQuery() + "::" + objectMapper.writeValueAsString(normalizedFilters);
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return CACHE_PREFIX + hex;
        } catch (Exception e) {
            // Fallback: combine query + filters hashCode — avoids Math.abs MIN_VALUE issue
            log.warn("[Cache] Key generation failed, using fallback key", e);
            int combined = java.util.Objects.hash(request.getQuery(), request.getFilters());
            return CACHE_PREFIX + "fallback_" + combined;
        }
    }

    // ── RRF (Reciprocal Rank Fusion) ──────────────────────────

    /**
     * score(d) = vectorWeight / (k + rank_v(d)) + bm25Weight / (k + rank_b(d))
     * Missing rank = candidateLimit + 1 (treated as lowest)
     */
    private List<SearchResult> rrf(List<SearchResult> vectorList, List<SearchResult> bm25List) {
        Map<String, Double>       scoreMap   = new HashMap<>();
        Map<String, SearchResult> resultMap  = new HashMap<>();

        accumulateRrf(vectorList, vectorWeight, scoreMap, resultMap);
        accumulateRrf(bm25List,   bm25Weight,   scoreMap, resultMap);

        return scoreMap.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .map(e -> {
                    SearchResult orig = resultMap.get(e.getKey());
                    return SearchResult.builder()
                            .chunkId(orig.getChunkId())
                            .documentId(orig.getDocumentId())
                            .filename(orig.getFilename())
                            .text(orig.getText())
                            .pageNumber(orig.getPageNumber())
                            .sectionTitle(orig.getSectionTitle())
                            .chunkType(orig.getChunkType())
                            .chunkIndex(orig.getChunkIndex())
                            .score(e.getValue())
                            .build();
                })
                .toList();
    }

    private void accumulateRrf(
            List<SearchResult> results,
            double weight,
            Map<String, Double> scoreMap,
            Map<String, SearchResult> resultMap
    ) {
        for (int i = 0; i < results.size(); i++) {
            SearchResult r = results.get(i);
            String key = r.getChunkId() != null ? r.getChunkId() : r.getText();
            if (key == null) continue;

            double rrfScore = weight / (rrfK + i + 1);
            scoreMap.merge(key, rrfScore, Double::sum);
            resultMap.putIfAbsent(key, r);
        }
    }
}
