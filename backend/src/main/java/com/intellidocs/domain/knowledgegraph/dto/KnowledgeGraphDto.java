package com.intellidocs.domain.knowledgegraph.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class KnowledgeGraphDto {

    @Getter @Builder
    public static class GraphResponse {
        private List<Node> nodes;
        private List<Edge> edges;
        private Stats stats;
    }

    @Getter @Builder
    public static class Node {
        private String id;        // "doc_{uuid}" or "metric_{normalizedName}"
        private String type;      // "document" or "metric"
        // Document fields
        private String name;
        private String fileType;
        private String status;
        private Integer metricsCount;
        // Metric fields
        private List<MetricOccurrence> occurrences;
        private MetricChange change;
    }

    @Getter @Builder
    public static class MetricOccurrence {
        private UUID documentId;
        private String documentName;
        private String value;
        private BigDecimal numericValue;
        private String unit;
        private String period;
        private Integer pageNumber;
    }

    @Getter @Builder
    public static class MetricChange {
        private BigDecimal from;
        private BigDecimal to;
        private BigDecimal changePercent;
        private String direction; // "increase", "decrease", "unchanged"
    }

    @Getter @Builder
    public static class Edge {
        private String id;
        private String source;  // "doc_{uuid}"
        private String target;  // "metric_{normalizedName}"
        private String period;
        private String value;
    }

    @Getter @Builder
    public static class Stats {
        private long totalDocuments;
        private long totalMetrics;
        private long totalEdges;
        private long crossDocumentMetrics;
    }

    @Getter @Builder
    public static class MetricDetailResponse {
        private String metricName;
        private List<MetricOccurrence> occurrences;
        private MetricChange change;
    }

    @Getter @Builder
    public static class SearchResponse {
        private List<Node> results;
    }

    @Getter @Builder
    public static class RebuildResponse {
        private String status;
        private String message;
    }

    @Getter @Builder
    public static class StatsResponse {
        private long totalDocuments;
        private long totalMetrics;
        private long crossDocumentMetrics;
    }
}
