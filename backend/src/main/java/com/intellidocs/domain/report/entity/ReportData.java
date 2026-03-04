package com.intellidocs.domain.report.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportData {

    private String title;
    private String summary;
    private List<Section> sections;
    private List<SourceRef> sources;
    private Metadata metadata;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Section {
        private String heading;
        private String content; // markdown
        private List<TableBlock> tables;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TableBlock {
        private String caption;
        private List<String> headers;
        private List<List<String>> rows;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SourceRef {
        private String documentId;
        private String filename;
        private String pageRange;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Metadata {
        private String reportType;

        @JsonIgnore // LLM JSON 응답에 포함되지 않음 — 파싱 후 수동 설정
        private LocalDateTime generatedAt;

        private String confidenceLevel;
    }
}
