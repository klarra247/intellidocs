package com.intellidocs.domain.agent.service;

import com.intellidocs.domain.agent.dto.SourceInfo;
import com.intellidocs.domain.search.dto.SearchResult;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Shared utilities for processing search results into sources and confidence scores.
 * Used by both AgentService (synchronous) and StreamingAgentService.
 */
public final class SearchResultUtils {

    private SearchResultUtils() {}

    /**
     * Deduplicate sources by documentId, merging page numbers into a pageRange string.
     * Preserves relevance order (highest-scoring document first).
     */
    public static List<SourceInfo> deduplicateSources(List<SearchResult> results) {
        // Group by documentId, preserving insertion order
        Map<UUID, List<SearchResult>> byDocument = new LinkedHashMap<>();
        for (SearchResult r : results) {
            if (r.getDocumentId() == null) continue;
            byDocument.computeIfAbsent(r.getDocumentId(), k -> new ArrayList<>()).add(r);
        }

        List<SourceInfo> sources = new ArrayList<>();
        for (Map.Entry<UUID, List<SearchResult>> entry : byDocument.entrySet()) {
            List<SearchResult> docResults = entry.getValue();
            SearchResult best = docResults.get(0); // first = highest relevance (insertion order)

            // Collect unique page numbers, sorted
            TreeSet<Integer> pages = new TreeSet<>();
            for (SearchResult r : docResults) {
                if (r.getPageNumber() != null) {
                    pages.add(r.getPageNumber());
                }
            }

            String pageRange = buildPageRange(pages);

            sources.add(SourceInfo.builder()
                    .documentId(best.getDocumentId())
                    .filename(best.getFilename())
                    .pageNumber(best.getPageNumber())
                    .sectionTitle(best.getSectionTitle())
                    .relevanceScore(best.getScore())
                    .pageRange(pageRange)
                    .build());
        }
        return sources;
    }

    /**
     * Build a display-friendly page range string from sorted page numbers.
     * Examples: "p.3", "p.1-3", "p.1,3,7", "p.1-3,7"
     */
    static String buildPageRange(TreeSet<Integer> pages) {
        if (pages.isEmpty()) return null;

        List<int[]> ranges = new ArrayList<>();
        int start = -1, end = -1;
        for (int p : pages) {
            if (start == -1) {
                start = end = p;
            } else if (p == end + 1) {
                end = p;
            } else {
                ranges.add(new int[]{start, end});
                start = end = p;
            }
        }
        ranges.add(new int[]{start, end});

        StringBuilder sb = new StringBuilder("p.");
        for (int i = 0; i < ranges.size(); i++) {
            if (i > 0) sb.append(",");
            int[] range = ranges.get(i);
            if (range[0] == range[1]) {
                sb.append(range[0]);
            } else {
                sb.append(range[0]).append("-").append(range[1]);
            }
        }
        return sb.toString();
    }

    /**
     * Compute confidence from the top-3 search result RRF scores.
     * Normalized to [0,1] using formula: min(1.0, top3Avg * 60).
     */
    public static double computeConfidence(List<SearchResult> results) {
        return computeConfidence(results, 0);
    }

    /**
     * Compute confidence with a boost when calculation tools were used.
     * Calculation tools produce deterministic results, so their usage
     * indicates the answer is mathematically verified.
     *
     * @param results           search results collected during tool execution
     * @param calculationCount  number of calculation tools invoked (0 = no boost)
     */
    public static double computeConfidence(List<SearchResult> results, int calculationCount) {
        if (results.isEmpty() && calculationCount == 0) return 0.0;

        double baseConfidence = 0.0;
        if (!results.isEmpty()) {
            double top3Avg = results.stream()
                    .mapToDouble(SearchResult::getScore)
                    .sorted()  // ascending
                    .skip(Math.max(0, results.size() - 3))  // take last 3 (highest)
                    .average()
                    .orElse(0.0);
            baseConfidence = Math.min(1.0, top3Avg * 60);
        }

        if (calculationCount > 0) {
            // Boost: calculation tool used → floor at MEDIUM (0.5), then add 0.15 per calc (cap at 1.0)
            double boost = 0.15 * calculationCount;
            baseConfidence = Math.min(1.0, Math.max(baseConfidence, 0.5) + boost);
        }

        return baseConfidence;
    }

    /**
     * Map a numeric confidence value to a tier label.
     */
    public static String computeConfidenceLevel(double confidence) {
        if (confidence >= 0.8) return "HIGH";
        if (confidence >= 0.5) return "MEDIUM";
        if (confidence >= 0.2) return "LOW";
        return "VERY_LOW";
    }
}
