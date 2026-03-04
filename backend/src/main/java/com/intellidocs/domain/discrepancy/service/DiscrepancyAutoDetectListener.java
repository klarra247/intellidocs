package com.intellidocs.domain.discrepancy.service;

import com.intellidocs.domain.discrepancy.entity.DiscrepancyResult;
import com.intellidocs.domain.discrepancy.entity.TriggerType;
import com.intellidocs.domain.discrepancy.repository.DiscrepancyResultRepository;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.event.DocumentIndexedEvent;
import com.intellidocs.domain.document.repository.DocumentRepository;
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

    @Async
    @EventListener
    public void onDocumentIndexed(DocumentIndexedEvent event) {
        try {
            // 중복 방지: 최근 5분 이내 AUTO 탐지가 있으면 스킵
            List<DiscrepancyResult> recentAuto =
                    discrepancyResultRepository.findTop10ByTriggerTypeOrderByCreatedAtDesc(TriggerType.AUTO);
            if (!recentAuto.isEmpty()) {
                DiscrepancyResult latest = recentAuto.get(0);
                if (latest.getCreatedAt() != null
                        && latest.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(5))) {
                    log.info("[AutoDetect] Skipping — recent AUTO detection exists ({})", latest.getId());
                    return;
                }
            }

            // INDEXED 문서 조회 (최대 10개, 최근순)
            List<Document> indexed = documentRepository.findByStatusOrderByCreatedAtDesc(DocumentStatus.INDEXED);
            if (indexed.size() < 2) {
                log.info("[AutoDetect] Skipping — fewer than 2 INDEXED documents");
                return;
            }

            List<UUID> docIds = indexed.stream()
                    .limit(10)
                    .map(Document::getId)
                    .collect(Collectors.toList());

            log.info("[AutoDetect] Starting auto detection for {} documents", docIds.size());
            discrepancyService.detectSync(docIds, null, 0.001, TriggerType.AUTO);
            log.info("[AutoDetect] Auto detection completed for document: {}", event.getDocumentId());

        } catch (Exception e) {
            log.error("[AutoDetect] Auto detection failed for document: {}", event.getDocumentId(), e);
        }
    }
}
