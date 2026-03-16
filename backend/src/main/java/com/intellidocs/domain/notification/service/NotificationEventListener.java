package com.intellidocs.domain.notification.service;

import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.event.DocumentIndexedEvent;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.notification.entity.NotificationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationService notificationService;
    private final DocumentRepository documentRepository;

    @Async
    @EventListener
    public void onDocumentIndexed(DocumentIndexedEvent event) {
        try {
            Document doc = documentRepository.findById(event.getDocumentId()).orElse(null);
            if (doc == null) return;

            String title = doc.getOriginalFilename() + " 처리가 완료되었습니다";

            notificationService.createNotification(
                    event.getUserId(),
                    null,
                    event.getWorkspaceId(),
                    NotificationType.DOCUMENT_INDEXED,
                    title,
                    null,
                    "document",
                    event.getDocumentId()
            );
        } catch (Exception e) {
            log.error("[Notification] Failed to create DOCUMENT_INDEXED notification for document: {}",
                    event.getDocumentId(), e);
        }
    }
}
