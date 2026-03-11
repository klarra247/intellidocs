package com.intellidocs.domain.diff.entity;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DiffResultData {

    private DiffSummary summary;
    private List<NumericChange> numericChanges;
    private List<TextChange> textChanges;
    private DiffMetadata metadata;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DiffSummary {
        private int totalChanges;
        private int added;
        private int removed;
        private int modified;
        private int unchanged;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class NumericChange {
        private String field;
        private String period;
        private String sourceValue;
        private String targetValue;
        private String unit;
        private Double changeAbsolute;
        private Double changePercent;
        private String direction; // INCREASED, DECREASED, UNCHANGED
        private Integer sourceChunkIndex;
        private Integer targetChunkIndex;
        private Integer sourcePageNumber;
        private Integer targetPageNumber;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TextChange {
        private String type; // ADDED, REMOVED, MODIFIED
        private String sectionTitle;
        private String summary;
        private Integer targetChunkIndex;
        private Integer targetPageNumber;
        private Integer sourceChunkIndex;
        private Integer sourcePageNumber;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DiffMetadata {
        private String sourceFilename;
        private String targetFilename;
        private String analysisModel;
        private LocalDateTime processedAt;
    }
}
