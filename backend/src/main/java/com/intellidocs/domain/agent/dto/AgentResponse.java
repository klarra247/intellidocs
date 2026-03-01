package com.intellidocs.domain.agent.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class AgentResponse {
    private String answer;
    private List<SourceInfo> sources;
    /** Normalised confidence in [0, 1] derived from RRF scores */
    private double confidence;
    /** Wall-clock ms for the full RAG round-trip */
    private long elapsedMs;
}
