package com.intellidocs.domain.agent.service;

import com.intellidocs.domain.agent.dto.SourceInfo;
import com.intellidocs.domain.search.dto.SearchResult;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Shared utilities for processing search results into sources and confidence scores.
 * Used by both AgentService (synchronous) and StreamingAgentService.
 */
public final class SearchResultUtils {

    private SearchResultUtils() {}

    /**
     * Deduplicate sources by (documentId, pageNumber), preserving relevance order.
     */
    public static List<SourceInfo> deduplicateSources(List<SearchResult> results) {
        Map<String, SourceInfo> sourceMap = new LinkedHashMap<>();
        for (SearchResult r : results) {
            if (r.getDocumentId() == null) continue;
            String key = r.getDocumentId() + ":" + r.getPageNumber();
            sourceMap.putIfAbsent(key, SourceInfo.builder()
                    .documentId(r.getDocumentId())
                    .filename(r.getFilename())
                    .pageNumber(r.getPageNumber())
                    .sectionTitle(r.getSectionTitle())
                    .relevanceScore(r.getScore())
                    .build());
        }
        return new ArrayList<>(sourceMap.values());
    }

    /**
     * Compute confidence from collected search result RRF scores.
     * Normalized to [0,1] using formula: min(1.0, avgScore * 60).
     */
    public static double computeConfidence(List<SearchResult> results) {
        if (results.isEmpty()) return 0.0;
        double avgScore = results.stream()
                .mapToDouble(SearchResult::getScore)
                .average()
                .orElse(0.0);
        return Math.min(1.0, avgScore * 60);
    }
}
