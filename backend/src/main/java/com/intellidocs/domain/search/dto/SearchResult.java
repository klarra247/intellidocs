package com.intellidocs.domain.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResult {
    private String chunkId;
    private UUID documentId;
    private String filename;
    private String text;
    private Integer pageNumber;
    private String sectionTitle;
    private String chunkType;
    private double score;   // RRF 합산 점수
}
