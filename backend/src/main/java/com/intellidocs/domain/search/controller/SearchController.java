package com.intellidocs.domain.search.controller;

import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.search.dto.SearchRequest;
import com.intellidocs.domain.search.dto.SearchResponse;
import com.intellidocs.domain.search.service.HybridSearchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final HybridSearchService hybridSearchService;

    /**
     * POST /api/v1/search
     *
     * Request body:
     * {
     *   "query": "보험 청구 절차",
     *   "filters": {
     *     "documentIds": ["uuid1", "uuid2"],
     *     "fileTypes": ["PDF"],
     *     "dateRange": { "from": "2024-01-01T00:00:00", "to": "2024-12-31T23:59:59" }
     *   },
     *   "limit": 10
     * }
     */
    @PostMapping
    public ResponseEntity<ApiResponse<SearchResponse>> search(
            @Valid @RequestBody SearchRequest request
    ) {
        SearchResponse response = hybridSearchService.search(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
