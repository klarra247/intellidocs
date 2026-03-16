package com.intellidocs.domain.discrepancy.service;

import com.intellidocs.domain.discrepancy.entity.DiscrepancyResult;
import com.intellidocs.domain.discrepancy.entity.TriggerType;
import com.intellidocs.domain.discrepancy.repository.DiscrepancyResultRepository;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class DiscrepancyAutoDetectListener {

    private final DocumentRepository documentRepository;
    private final DiscrepancyService discrepancyService;
    private final DiscrepancyResultRepository discrepancyResultRepository;
    private final NotificationService notificationService;

    @Async
    @EventListener
    public void onDocumentIndexed(DocumentIndexedEvent event) {
        try {
            // 중복 방지: 동일 유저의 최근 5분 이내 AUTO 탐지가 있으면 스킵
            UUID userId = event.getUserId();
            List<DiscrepancyResult> recentAuto =
                    discrepancyResultRepository.findTop10ByUserIdAndTriggerTypeOrderByCreatedAtDesc(userId, TriggerType.AUTO);
            if (!recentAuto.isEmpty()) {
                DiscrepancyResult latest = recentAuto.get(0);
                if (latest.getCreatedAt() != null
                        && latest.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(5))) {
                    log.info("[AutoDetect] Skipping — recent AUTO detection exists for user {} ({})", userId, latest.getId());
                    return;
                }
            }

            // INDEXED 문서 조회 — 동일 워크스페이스 내 문서 우선, 없으면 유저 기준 (최대 10개)
            UUID workspaceId = event.getWorkspaceId();
            List<Document> indexed;
            if (workspaceId != null) {
                indexed = documentRepository.findByWorkspaceIdAndStatus(workspaceId, DocumentStatus.INDEXED);
            } else {
                indexed = documentRepository.findByUserIdAndStatus(userId, DocumentStatus.INDEXED);
            }
            if (indexed.size() < 2) {
                log.info("[AutoDetect] Skipping — fewer than 2 INDEXED documents for user {}", userId);
                return;
            }

            List<UUID> docIds = indexed.stream()
                    .limit(10)
                    .map(Document::getId)
                    .collect(Collectors.toList());

            log.info("[AutoDetect] Starting auto detection for {} documents (user: {})", docIds.size(), userId);
            discrepancyService.detectSync(docIds, null, 0.001, TriggerType.AUTO, userId);
            try {
                var latestResults = discrepancyResultRepository
                        .findTop10ByUserIdAndTriggerTypeOrderByCreatedAtDesc(userId, TriggerType.AUTO);
                if (!latestResults.isEmpty() && latestResults.get(0).getResultData() != null) {
                    var resultData = latestResults.get(0).getResultData();
                    int found = resultData.getDiscrepancies() != null ? resultData.getDiscrepancies().size() : 0;
                    if (found > 0) {
                        notificationService.createNotification(
                                userId,
                                null,
                                event.getWorkspaceId(),
                                NotificationType.DISCREPANCY_FOUND,
                                found + "건의 수치 불일치가 발견되었습니다",
                                null,
                                "discrepancy",
                                latestResults.get(0).getId()
                        );
                    }
                }
            } catch (Exception e) {
                log.warn("[Notification] Failed to send DISCREPANCY_FOUND notification", e);
            }
            log.info("[AutoDetect] Auto detection completed for document: {}", event.getDocumentId());

        } catch (Exception e) {
            log.error("[AutoDetect] Auto detection failed for document: {}", event.getDocumentId(), e);
        }
    }
}
