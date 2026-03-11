package com.intellidocs.domain.diff.dto;

import com.intellidocs.domain.diff.entity.DiffResultData;
import com.intellidocs.domain.diff.entity.DocumentVersionDiff;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

public class DiffDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiffRequest {
        @NotNull
        private UUID sourceDocumentId;
        @NotNull
        private UUID targetDocumentId;
    }

    @Getter
    @Builder
    public static class DiffResponse {
        private UUID diffId;
        private String status;
    }

    @Getter
    @Builder
    public static class DiffDetailResponse {
        private UUID id;
        private UUID sourceDocumentId;
        private UUID targetDocumentId;
        private String diffType;
        private String status;
        private DiffResultData resultData;
        private LocalDateTime createdAt;

        public static DiffDetailResponse from(DocumentVersionDiff diff) {
            return DiffDetailResponse.builder()
                    .id(diff.getId())
                    .sourceDocumentId(diff.getSourceDocumentId())
                    .targetDocumentId(diff.getTargetDocumentId())
                    .diffType(diff.getDiffType().name())
                    .status(diff.getStatus().name())
                    .resultData(diff.getResultData())
                    .createdAt(diff.getCreatedAt())
                    .build();
        }
    }

    @Getter
    @Builder
    public static class StatusEvent {
        private UUID diffId;
        private String status;
        private String message;
        private Integer progress;
    }
}
