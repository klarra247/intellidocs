package com.intellidocs.domain.discrepancy.entity;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DiscrepancyResultData {

    private List<Discrepancy> discrepancies;
    private Summary summary;
    private List<String> checkedFields;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Discrepancy {
        private String field;
        private String period;
        private List<Entry> entries;
        private String difference;
        private Double differencePercent;
        private String severity; // INFO, WARNING, CRITICAL
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Entry {
        private String documentId;
        private String filename;
        private String value;
        private Double numericValue;
        private String unit;
        private Integer page;
        private Integer chunkIndex;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Summary {
        private Integer totalFieldsChecked;
        private Integer discrepanciesFound;
        private Map<String, Integer> bySeverity;
    }
}
