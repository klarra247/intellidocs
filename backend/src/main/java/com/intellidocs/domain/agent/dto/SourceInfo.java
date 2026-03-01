package com.intellidocs.domain.agent.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class SourceInfo {
    private UUID documentId;
    private String filename;
    private Integer pageNumber;
    private String sectionTitle;
    private double relevanceScore;
}
