package com.intellidocs.domain.agent.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AgentResponse {
    private String answer;
    private List<SourceInfo> sources;
    /** Normalised confidence in [0, 1] derived from RRF scores */
    private double confidence;
    /** Confidence tier: HIGH, MEDIUM, LOW, VERY_LOW */
    private String confidenceLevel;
    /** Wall-clock ms for the full RAG round-trip */
    private long elapsedMs;
    /** Structured table data extracted from markdown tables in the answer (nullable) */
    private List<TableData> tableData;

    @Getter
    @Builder
    public static class TableData {
        private List<String> headers;
        private List<List<String>> rows;
    }
}
