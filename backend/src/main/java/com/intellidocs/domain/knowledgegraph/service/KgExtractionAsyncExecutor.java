package com.intellidocs.domain.knowledgegraph.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class KgExtractionAsyncExecutor {

    private final MetricExtractionService metricExtractionService;

    @Async
    public void extractMetrics(UUID documentId, UUID workspaceId) {
        try {
            log.info("[KG] Starting async metric extraction for document: {}", documentId);
            metricExtractionService.extractMetrics(documentId);
            log.info("[KG] Metric extraction completed for document: {}", documentId);
        } catch (Exception e) {
            log.error("[KG] Metric extraction failed for document: {}", documentId, e);
        }
    }
}
