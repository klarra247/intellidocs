package com.intellidocs.domain.document.dto;

import com.intellidocs.domain.document.entity.ReviewStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

public class ReviewStatusDto {

    public record ReviewRequest(
            @NotNull ReviewStatus status
    ) {}

    @Builder
    public record ReviewResponse(
            UUID documentId,
            ReviewStatus reviewStatus,
            UUID reviewRequestedBy,
            String reviewRequestedByName,
            LocalDateTime reviewRequestedAt,
            UUID reviewedBy,
            String reviewedByName,
            LocalDateTime reviewedAt
    ) {}
}
