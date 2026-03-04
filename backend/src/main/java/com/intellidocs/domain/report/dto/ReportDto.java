package com.intellidocs.domain.report.dto;

import com.intellidocs.domain.report.entity.Report;
import com.intellidocs.domain.report.entity.ReportStatus;
import com.intellidocs.domain.report.entity.ReportType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class ReportDto {

    @Getter
    @Builder
    public static class GenerateRequest {
        @NotNull(message = "리포트 유형을 선택해 주세요.")
        private ReportType reportType;

        @NotBlank(message = "리포트 제목을 입력해 주세요.")
        @Size(max = 200, message = "리포트 제목은 200자 이하로 입력해 주세요.")
        private String title;

        @Setter
        private List<UUID> documentIds;

        @Size(max = 1000, message = "추가 지시사항은 1000자 이하로 입력해 주세요.")
        private String prompt;
    }

    @Getter
    @Builder
    public static class GenerateResponse {
        private UUID reportId;
        private ReportStatus status;
    }

    @Getter
    @Builder
    public static class ListResponse {
        private UUID id;
        private String title;
        private ReportType reportType;
        private ReportStatus status;
        private Long fileSize;
        private LocalDateTime createdAt;
        private LocalDateTime completedAt;

        public static ListResponse from(Report report) {
            return ListResponse.builder()
                    .id(report.getId())
                    .title(report.getTitle())
                    .reportType(report.getReportType())
                    .status(report.getStatus())
                    .fileSize(report.getFileSize())
                    .createdAt(report.getCreatedAt())
                    .completedAt(report.getCompletedAt())
                    .build();
        }
    }

    @Getter
    @Builder
    public static class StatusEvent {
        private UUID reportId;
        private ReportStatus status;
        private String message;
        private Integer progress; // 0-100
    }
}
