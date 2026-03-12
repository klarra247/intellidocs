package com.intellidocs.domain.knowledgegraph.service;

import com.intellidocs.domain.document.event.DocumentIndexedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class KgExtractionListener {

    private final KgExtractionAsyncExecutor asyncExecutor;

    @EventListener
    public void onDocumentIndexed(DocumentIndexedEvent event) {
        log.info("[KG] DocumentIndexedEvent received — triggering KG extraction for document: {}",
                event.getDocumentId());
        asyncExecutor.extractAndBuildRelations(event.getDocumentId(), event.getWorkspaceId());
    }
}
