package com.intellidocs.domain.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.extern.jackson.Jacksonized;

import java.util.List;

@Getter
@Builder
@Jacksonized        // enables Jackson to use the Lombok builder for deserialization
@NoArgsConstructor
@AllArgsConstructor
public class SearchResponse {
    private List<SearchResult> results;
    // Current page count; equals results.size() — no server-side pagination in Phase 1
    private int totalResults;
    private long elapsedMs;
    private int vectorHits;
    private int bm25Hits;
    // Echoed from request for client convenience (client can display active filters)
    private SearchRequest.Filters appliedFilters;
}
