package com.intellidocs.domain.discrepancy.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidocs.domain.discrepancy.entity.DiscrepancyResult;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class DiscrepancyDto {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Getter @Builder
    public static class DetectRequest {
        @NotNull(message = "문서 ID 목록은 필수입니다.")
        @Size(min = 2, message = "비교를 위해 최소 2개의 문서가 필요합니다.")
        @Setter
        private List<UUID> documentIds;

        private List<String> targetFields;

        @DecimalMin(value = "0", message = "허용 오차는 0 이상이어야 합니다.")
        @DecimalMax(value = "1", message = "허용 오차는 1 이하여야 합니다.")
        private BigDecimal tolerance;
    }

    @Getter @Builder
    public static class DetectResponse {
        private UUID jobId;
        private String status;
    }

    @Getter @Builder
    public static class ResultResponse {
        private UUID id;
        private String status;
        private String triggerType;
        private JsonNode resultData;
        private List<UUID> documentIds;
        private BigDecimal tolerance;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public static ResultResponse from(DiscrepancyResult result) {
            JsonNode resultDataNode = null;
            if (result.getResultData() != null) {
                resultDataNode = objectMapper.valueToTree(result.getResultData());
            }

            return ResultResponse.builder()
                    .id(result.getId())
                    .status(result.getStatus().name())
                    .triggerType(result.getTriggerType().name())
                    .resultData(resultDataNode)
                    .documentIds(result.getDocumentIds())
                    .tolerance(result.getTolerance())
                    .createdAt(result.getCreatedAt())
                    .updatedAt(result.getUpdatedAt())
                    .build();
        }
    }

    @Getter @Builder
    public static class StatusEvent {
        private UUID jobId;
        private String status;
        private String message;
        private Integer progress;
    }
}
