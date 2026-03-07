package com.intellidocs.domain.discrepancy.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.discrepancy.dto.DiscrepancyDto;
import com.intellidocs.domain.discrepancy.entity.DiscrepancyResult;
import com.intellidocs.domain.discrepancy.entity.DiscrepancyResultData;
import com.intellidocs.domain.discrepancy.entity.DiscrepancyStatus;
import com.intellidocs.domain.discrepancy.entity.TriggerType;
import com.intellidocs.domain.discrepancy.repository.DiscrepancyResultRepository;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DiscrepancyService {

    private final DiscrepancyResultRepository discrepancyResultRepository;
    private final DocumentRepository documentRepository;
    private final DiscrepancySseEmitterService sseEmitterService;
    private final DiscrepancyDetectionEngine engine;

    @Transactional
    public DiscrepancyDto.DetectResponse createJob(DiscrepancyDto.DetectRequest request, UUID userId) {
        validateRequest(request);

        BigDecimal tolerance = request.getTolerance() != null
                ? request.getTolerance()
                : new BigDecimal("0.001");

        DiscrepancyResult result = DiscrepancyResult.builder()
                .userId(userId)
                .documentIds(request.getDocumentIds())
                .targetFields(request.getTargetFields())
                .tolerance(tolerance)
                .triggerType(TriggerType.MANUAL)
                .build();

        discrepancyResultRepository.save(result);

        return DiscrepancyDto.DetectResponse.builder()
                .jobId(result.getId())
                .status(result.getStatus().name())
                .build();
    }

    public void executeDetection(UUID jobId) {
        DiscrepancyResult result = discrepancyResultRepository.findById(jobId)
                .orElseThrow(() -> BusinessException.notFound("DiscrepancyResult", jobId));

        try {
            result.startDetecting();
            discrepancyResultRepository.save(result);
            sendProgress(jobId, DiscrepancyStatus.DETECTING, "불일치 탐지를 시작합니다.", 0);

            // 문서 로드
            List<Document> documents = documentRepository.findAllById(result.getDocumentIds());
            if (documents.size() < 2) {
                throw new IllegalStateException("비교 가능한 문서가 2개 미만입니다.");
            }

            // Stage 1: 항목 식별
            sendProgress(jobId, DiscrepancyStatus.DETECTING, "공통 항목 탐색 중...", 10);
            List<String> fields;
            if (result.getTargetFields() != null && !result.getTargetFields().isEmpty()) {
                fields = result.getTargetFields();
                log.info("[Discrepancy] Using provided target fields: {}", fields);
            } else {
                fields = engine.identifyCommonFields(documents);
                log.info("[Discrepancy] Auto-identified fields: {}", fields);
            }

            if (fields.isEmpty()) {
                DiscrepancyResultData data = DiscrepancyResultData.builder()
                        .discrepancies(List.of())
                        .checkedFields(List.of())
                        .summary(DiscrepancyResultData.Summary.builder()
                                .totalFieldsChecked(0)
                                .discrepanciesFound(0)
                                .build())
                        .build();
                result.complete(data);
                discrepancyResultRepository.save(result);
                sendProgress(jobId, DiscrepancyStatus.COMPLETED, "공통 수치 항목을 찾지 못했습니다.", 100);
                return;
            }

            // Stage 2: 수치 추출 (항목별 진행률 SSE)
            int totalSteps = fields.size();
            Map<String, List<DiscrepancyDetectionEngine.ExtractedValue>> extracted = new LinkedHashMap<>();
            for (int i = 0; i < fields.size(); i++) {
                String field = fields.get(i);
                int progress = 20 + (int) ((double) (i + 1) / totalSteps * 50); // 20~70%
                sendProgress(jobId, DiscrepancyStatus.DETECTING,
                        String.format("수치 추출 중... (%d/%d 항목)", i + 1, totalSteps), progress);

                Map<String, List<DiscrepancyDetectionEngine.ExtractedValue>> partial =
                        engine.extractValues(documents, List.of(field));
                if (partial.containsKey(field)) {
                    extracted.put(field, partial.get(field));
                }
            }

            // Stage 3: 비교
            sendProgress(jobId, DiscrepancyStatus.DETECTING, "수치 비교 중...", 80);
            double tolerance = result.getTolerance() != null
                    ? result.getTolerance().doubleValue()
                    : 0.001;
            DiscrepancyResultData data = engine.compare(extracted, tolerance);

            result.complete(data);
            discrepancyResultRepository.save(result);

            int found = data.getDiscrepancies() != null ? data.getDiscrepancies().size() : 0;
            sendProgress(jobId, DiscrepancyStatus.COMPLETED,
                    String.format("탐지 완료: %d건의 불일치 발견", found), 100);

        } catch (Exception e) {
            log.error("Discrepancy detection failed for job: {}", jobId, e);
            result.fail(e.getMessage());
            discrepancyResultRepository.save(result);
            sendProgress(jobId, DiscrepancyStatus.FAILED, "탐지 중 오류가 발생했습니다: " + e.getMessage(), 0);
        } finally {
            sseEmitterService.complete(jobId);
        }
    }

    /**
     * 동기적으로 불일치 탐지를 실행하고 결과를 반환한다.
     * Agent Tool 컨텍스트에서 사용 (SSE 없음, DB 저장 유지).
     */
    @Transactional
    public DiscrepancyResultData detectSync(List<UUID> documentIds, List<String> targetFields,
                                            double tolerance, UUID userId) {
        return detectSync(documentIds, targetFields, tolerance, TriggerType.TOOL, userId);
    }

    @Transactional
    public DiscrepancyResultData detectSync(List<UUID> documentIds, List<String> targetFields,
                                            double tolerance, TriggerType triggerType, UUID userId) {
        List<Document> documents = documentRepository.findAllById(documentIds);
        if (documents.size() < 2) {
            throw new IllegalStateException("비교 가능한 INDEXED 문서가 2개 미만입니다.");
        }

        // 항목 식별
        List<String> fields;
        if (targetFields != null && !targetFields.isEmpty()) {
            fields = targetFields;
        } else {
            fields = engine.identifyCommonFields(documents);
        }

        if (fields.isEmpty()) {
            return DiscrepancyResultData.builder()
                    .discrepancies(List.of())
                    .checkedFields(List.of())
                    .summary(DiscrepancyResultData.Summary.builder()
                            .totalFieldsChecked(0)
                            .discrepanciesFound(0)
                            .build())
                    .build();
        }

        // 수치 추출
        Map<String, List<DiscrepancyDetectionEngine.ExtractedValue>> extracted =
                engine.extractValues(documents, fields);

        // 비교
        DiscrepancyResultData data = engine.compare(extracted, tolerance);

        // DB 저장
        DiscrepancyResult result = DiscrepancyResult.builder()
                .userId(userId)
                .documentIds(documentIds)
                .targetFields(targetFields)
                .tolerance(new BigDecimal(String.valueOf(tolerance)))
                .triggerType(triggerType)
                .build();
        result.startDetecting();
        result.complete(data);
        discrepancyResultRepository.save(result);

        return data;
    }

    @Transactional(readOnly = true)
    public DiscrepancyResult getResult(UUID id) {
        return discrepancyResultRepository.findById(id)
                .orElseThrow(() -> BusinessException.notFound("DiscrepancyResult", id));
    }

    @Transactional(readOnly = true)
    public List<DiscrepancyResult> getRecent(TriggerType triggerType, UUID userId) {
        if (triggerType != null) {
            return discrepancyResultRepository.findTop10ByUserIdAndTriggerTypeOrderByCreatedAtDesc(userId, triggerType);
        }
        return discrepancyResultRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId);
    }

    private void validateRequest(DiscrepancyDto.DetectRequest request) {
        if (request.getDocumentIds() == null || request.getDocumentIds().isEmpty()) {
            throw BusinessException.badRequest("비교할 문서 ID를 지정해 주세요.");
        }

        // 중복 제거
        List<UUID> deduped = new LinkedHashSet<>(request.getDocumentIds()).stream().toList();
        request.setDocumentIds(deduped);

        if (deduped.size() < 2) {
            throw BusinessException.badRequest("비교를 위해 최소 2개의 서로 다른 문서가 필요합니다.");
        }

        if (deduped.size() > 10) {
            throw BusinessException.badRequest("한 번에 최대 10개 문서까지 비교 가능합니다.");
        }

        if (request.getTolerance() != null) {
            if (request.getTolerance().compareTo(BigDecimal.ZERO) < 0
                    || request.getTolerance().compareTo(BigDecimal.ONE) > 0) {
                throw BusinessException.badRequest("허용 오차는 0에서 1 사이여야 합니다.");
            }
        }

        // DB 존재 및 상태 확인
        for (UUID docId : deduped) {
            Document doc = documentRepository.findById(docId)
                    .orElseThrow(() -> BusinessException.notFound("Document", docId));

            if (doc.getStatus() != DocumentStatus.INDEXED) {
                throw BusinessException.badRequest(
                        "문서 '" + doc.getOriginalFilename() + "'이(가) 아직 인덱싱되지 않았습니다. (현재 상태: " + doc.getStatus() + ")");
            }
        }
    }

    private void sendProgress(UUID jobId, DiscrepancyStatus status, String message, int progress) {
        sseEmitterService.send(jobId, DiscrepancyDto.StatusEvent.builder()
                .jobId(jobId)
                .status(status.name())
                .message(message)
                .progress(progress)
                .build());
    }
}
