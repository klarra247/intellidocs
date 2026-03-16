package com.intellidocs.domain.diff.service;

import com.intellidocs.domain.diff.entity.DiffType;
import com.intellidocs.domain.diff.entity.DocumentVersionDiff;
import com.intellidocs.domain.diff.repository.DiffRepository;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.event.DocumentIndexedEvent;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.notification.entity.NotificationType;
import com.intellidocs.domain.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class VersionDiffAutoTriggerListener {

    private final DocumentRepository documentRepository;
    private final DiffRepository diffRepository;
    private final DiffService diffService;
    private final NotificationService notificationService;

    @Async
    @EventListener
    public void onDocumentIndexed(DocumentIndexedEvent event) {
        try {
            UUID documentId = event.getDocumentId();
            Document document = documentRepository.findById(documentId).orElse(null);
            if (document == null) return;

            // parentVersionId가 없으면 버전 업로드가 아님
            UUID parentVersionId = document.getParentVersionId();
            if (parentVersionId == null) return;

            // 부모 문서 INDEXED 확인
            Document parent = documentRepository.findById(parentVersionId).orElse(null);
            if (parent == null || parent.getStatus() != DocumentStatus.INDEXED) {
                log.info("[AutoDiff] Parent document not INDEXED, skipping auto diff for {}", documentId);
                return;
            }

            // 이미 같은 source-target diff 존재하면 스킵
            if (diffRepository.findBySourceDocumentIdAndTargetDocumentId(parentVersionId, documentId).isPresent()) {
                log.info("[AutoDiff] Diff already exists for {} → {}", parentVersionId, documentId);
                return;
            }

            // diff 생성
            DocumentVersionDiff diff = DocumentVersionDiff.builder()
                    .sourceDocumentId(parentVersionId)
                    .targetDocumentId(documentId)
                    .workspaceId(event.getWorkspaceId())
                    .diffType(DiffType.VERSION)
                    .build();
            diffRepository.save(diff);

            log.info("[AutoDiff] Starting auto diff: {} → {} (diffId={})", parentVersionId, documentId, diff.getId());
            diffService.executeDiff(diff.getId());

            try {
                Document doc = documentRepository.findById(event.getDocumentId()).orElse(null);
                if (doc != null) {
                    notificationService.createNotification(
                            event.getUserId(),
                            null,
                            event.getWorkspaceId(),
                            NotificationType.VERSION_DIFF_COMPLETED,
                            doc.getOriginalFilename() + " 버전 비교가 완료되었습니다",
                            null,
                            "document",
                            event.getDocumentId()
                    );
                }
            } catch (Exception e) {
                log.warn("[Notification] Failed to send VERSION_DIFF_COMPLETED notification", e);
            }

        } catch (Exception e) {
            log.error("[AutoDiff] Auto diff failed for document: {}", event.getDocumentId(), e);
        }
    }
}
