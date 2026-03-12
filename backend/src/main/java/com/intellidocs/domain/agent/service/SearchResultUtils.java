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
     * Convert search results to individual SourceInfo entries (one per chunk).
     * Frontend handles grouping by documentId for display.
     * Deduplicates by chunkIndex to avoid showing the same chunk twice.
     */
    public static List<SourceInfo> toSources(List<SearchResult> results) {
        // Deduplicate by chunkIndex (same chunk may appear in both vector & BM25 results)
        Map<Integer, SearchResult> byChunk = new LinkedHashMap<>();
        for (SearchResult r : results) {
            if (r.getDocumentId() == null) continue;
            byChunk.merge(r.getChunkIndex(), r,
                    (existing, incoming) -> existing.getScore() >= incoming.getScore() ? existing : incoming);
        }

        return byChunk.values().stream()
                .map(r -> SourceInfo.builder()
                        .documentId(r.getDocumentId())
                        .filename(r.getFilename())
                        .pageNumber(r.getPageNumber())
                        .sectionTitle(r.getSectionTitle())
                        .chunkIndex(r.getChunkIndex())
                        .relevanceScore(r.getScore())
                        .pageRange(null)
                        .build())
                .toList();
    }

    /**
     * @deprecated Use {@link #toSources(List)} instead. Kept for backward compatibility.
     */
    @Deprecated
    public static List<SourceInfo> deduplicateSources(List<SearchResult> results) {
        return toSources(results);
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
        return computeConfidence(results, calculationCount, 0);
    }

    /**
     * Compute confidence with boosts for calculation and discrepancy detection tools.
     *
     * @param results                    search results collected during tool execution
     * @param calculationCount           number of calculation tools invoked (0 = no boost)
     * @param discrepancyDetectionCount  number of discrepancy detection tools invoked (0 = no boost)
     */
    public static double computeConfidence(List<SearchResult> results, int calculationCount,
                                           int discrepancyDetectionCount) {
        return computeConfidence(results, calculationCount, discrepancyDetectionCount, 0);
    }

    /**
     * Compute confidence with boosts for calculation, discrepancy detection, and version comparison tools.
     *
     * @param results                    search results collected during tool execution
     * @param calculationCount           number of calculation tools invoked (0 = no boost)
     * @param discrepancyDetectionCount  number of discrepancy detection tools invoked (0 = no boost)
     * @param versionComparisonCount     number of version comparison tools invoked (0 = no boost)
     */
    public static double computeConfidence(List<SearchResult> results, int calculationCount,
                                           int discrepancyDetectionCount, int versionComparisonCount) {
        if (results.isEmpty() && calculationCount == 0 && discrepancyDetectionCount == 0
                && versionComparisonCount == 0) return 0.0;

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

        if (discrepancyDetectionCount > 0) {
            // Discrepancy detection is deterministic DB+engine analysis → floor at HIGH (0.8)
            baseConfidence = Math.min(1.0, Math.max(baseConfidence, 0.8) + 0.1 * discrepancyDetectionCount);
        }

        if (versionComparisonCount > 0) {
            // Version comparison returns pre-computed DB data → floor at 0.95
            baseConfidence = Math.max(baseConfidence, 0.95);
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
