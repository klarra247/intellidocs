package com.intellidocs.domain.search.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchRequest {

    @NotBlank
    private String query;

    private Filters filters;

    @Min(1)
    @Max(50)
    private Integer limit;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Filters {
        private List<UUID> documentIds;
        private List<String> fileTypes;
        private DateRange dateRange;
        private UUID workspaceId;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DateRange {
        private LocalDateTime from;
        private LocalDateTime to;
    }
}
