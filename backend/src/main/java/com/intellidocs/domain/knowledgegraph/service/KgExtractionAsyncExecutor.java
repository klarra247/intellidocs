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

    private final EntityExtractionService entityExtractionService;
    private final RelationExtractionService relationExtractionService;

    @Async
    public void extractAndBuildRelations(UUID documentId, UUID workspaceId) {
        try {
            log.info("[KG] Starting async entity extraction for document: {}", documentId);
            entityExtractionService.extractEntities(documentId);

            log.info("[KG] Starting rule-based relation extraction for workspace: {}", workspaceId);
            relationExtractionService.extractRuleBasedRelations(workspaceId);

            relationExtractionService.extractLlmBasedRelations(workspaceId);

            log.info("[KG] KG extraction completed for document: {}", documentId);
        } catch (Exception e) {
            log.error("[KG] KG extraction failed for document: {}", documentId, e);
        }
    }
}
