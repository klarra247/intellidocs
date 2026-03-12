package com.intellidocs.domain.knowledgegraph.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
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
        private UUID id;
        private String type;
        private String entityType;
        private String name;
        private String normalizedName;
        private String value;
        private String period;
        private UUID documentId;
        private String documentName;
        private Integer pageNumber;
        private String fileType;
        private String status;
    }

    @Getter @Builder
    public static class Edge {
        private UUID id;
        private UUID source;
        private UUID target;
        private String relationType;
        private String description;
        private BigDecimal confidence;
    }

    @Getter @Builder
    public static class Stats {
        private long totalNodes;
        private long totalEdges;
        private Map<String, Long> entityTypes;
    }

    @Getter @Builder
    public static class EntityDetailResponse {
        private Node entity;
        private List<Node> relatedEntities;
        private String sourceChunkText;
        private DocumentInfo document;
    }

    @Getter @Builder
    public static class DocumentInfo {
        private UUID id;
        private String filename;
        private String fileType;
        private String status;
    }

    @Getter @Builder
    public static class SearchResponse {
        private List<Node> entities;
    }

    @Getter @Builder
    public static class RebuildResponse {
        private String status;
        private String message;
    }

    @Getter @Builder
    public static class StatsResponse {
        private long totalEntities;
        private long totalRelations;
        private Map<String, Long> byType;
    }
}
