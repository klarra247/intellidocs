package com.intellidocs.domain.diff.service;

import com.intellidocs.domain.diff.entity.DiffResultData;
import com.intellidocs.domain.diff.entity.DiffResultData.*;
import com.intellidocs.domain.discrepancy.service.DiscrepancyDetectionEngine;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.repository.DocumentChunkRepository;
import com.intellidocs.domain.search.dto.SearchRequest;
import com.intellidocs.domain.search.dto.SearchResponse;
import com.intellidocs.domain.search.dto.SearchResult;
import com.intellidocs.domain.search.service.HybridSearchService;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
public class DocumentDiffEngine {

    private final DiscrepancyDetectionEngine engine;
    private final DocumentChunkRepository chunkRepo;
    private final HybridSearchService searchService;
    private final ChatLanguageModel llm;

    public DocumentDiffEngine(
            DiscrepancyDetectionEngine engine,
            DocumentChunkRepository chunkRepo,
            HybridSearchService searchService,
            @Qualifier("discrepancyChatLanguageModel") ChatLanguageModel llm) {
        this.engine = engine;
        this.chunkRepo = chunkRepo;
        this.searchService = searchService;
        this.llm = llm;
    }

    public List<NumericChange> compareNumericValues(Document source, Document target) {
        log.info("[DiffEngine] === Numeric comparison start ===");
        log.info("[DiffEngine] Source: id={}, filename={}", source.getId(), source.getOriginalFilename());
        log.info("[DiffEngine] Target: id={}, filename={}", target.getId(), target.getOriginalFilename());

        // 1. 공통 수치 항목 식별
        List<String> fields = engine.identifyCommonFields(List.of(source, target));
        if (fields.isEmpty()) {
            log.info("[DiffEngine] No common numeric fields found between {} and {}", source.getId(), target.getId());
            return List.of();
        }
        log.info("[DiffEngine] Common fields: {}", fields);

        // 2. 양쪽 문서에서 수치 추출
        Map<String, List<DiscrepancyDetectionEngine.ExtractedValue>> extracted =
                engine.extractValues(List.of(source, target), fields);

        // 3. 버전 비교: 각 문서의 최신 기간 값 기준으로 비교
        List<NumericChange> changes = new ArrayList<>();
        for (Map.Entry<String, List<DiscrepancyDetectionEngine.ExtractedValue>> entry : extracted.entrySet()) {
            String field = entry.getKey();
            List<DiscrepancyDetectionEngine.ExtractedValue> values = entry.getValue();

            // source/target 분리
            List<DiscrepancyDetectionEngine.ExtractedValue> sourceValues = new ArrayList<>();
            List<DiscrepancyDetectionEngine.ExtractedValue> targetValues = new ArrayList<>();

            for (DiscrepancyDetectionEngine.ExtractedValue v : values) {
                if (source.getId().toString().equals(v.getDocumentId())) {
                    sourceValues.add(v);
                } else if (target.getId().toString().equals(v.getDocumentId())) {
                    targetValues.add(v);
                }
            }

            log.info("[DiffEngine] Field '{}': source extracted {} values, target extracted {} values",
                    field, sourceValues.size(), targetValues.size());
            for (DiscrepancyDetectionEngine.ExtractedValue sv : sourceValues) {
                log.info("[DiffEngine]   SOURCE: period='{}', value='{}', numericValue={}, docId={}",
                        sv.getPeriod(), sv.getValue(), sv.getNumericValue(), sv.getDocumentId());
            }
            for (DiscrepancyDetectionEngine.ExtractedValue tv : targetValues) {
                log.info("[DiffEngine]   TARGET: period='{}', value='{}', numericValue={}, docId={}",
                        tv.getPeriod(), tv.getValue(), tv.getNumericValue(), tv.getDocumentId());
            }

            if (sourceValues.isEmpty() || targetValues.isEmpty()) continue;

            // Period 기준으로 그룹핑
            Map<String, DiscrepancyDetectionEngine.ExtractedValue> sourceByPeriod = new LinkedHashMap<>();
            Map<String, DiscrepancyDetectionEngine.ExtractedValue> targetByPeriod = new LinkedHashMap<>();
            for (DiscrepancyDetectionEngine.ExtractedValue v : sourceValues) {
                String period = v.getPeriod() != null ? v.getPeriod() : "N/A";
                sourceByPeriod.putIfAbsent(period, v);
            }
            for (DiscrepancyDetectionEngine.ExtractedValue v : targetValues) {
                String period = v.getPeriod() != null ? v.getPeriod() : "N/A";
                targetByPeriod.putIfAbsent(period, v);
            }

            // Strategy A: 같은 기간 매칭 (값이 실제로 다른 경우만)
            boolean foundMeaningfulChange = false;
            Set<String> commonPeriods = new LinkedHashSet<>(sourceByPeriod.keySet());
            commonPeriods.retainAll(targetByPeriod.keySet());

            for (String period : commonPeriods) {
                DiscrepancyDetectionEngine.ExtractedValue sv = sourceByPeriod.get(period);
                DiscrepancyDetectionEngine.ExtractedValue tv = targetByPeriod.get(period);
                if (sv.getNumericValue() == null || tv.getNumericValue() == null) continue;

                double sVal = sv.getNumericValue();
                double tVal = tv.getNumericValue();
                double changeAbsolute = tVal - sVal;

                // 같은 기간 + 같은 값이면 변화 아님 → 스킵
                if (Math.abs(changeAbsolute) < 0.001) {
                    log.info("[DiffEngine] Field '{}' period '{}': same value {} → skip", field, period, sVal);
                    continue;
                }

                Double changePercent = sVal != 0 ? (changeAbsolute / sVal) * 100 : null;
                String direction = changeAbsolute > 0 ? "INCREASED" : "DECREASED";

                changes.add(NumericChange.builder()
                        .field(field)
                        .period(period)
                        .sourceValue(sv.getValue())
                        .targetValue(tv.getValue())
                        .unit(sv.getUnit())
                        .changeAbsolute(changeAbsolute)
                        .changePercent(changePercent)
                        .direction(direction)
                        .sourcePageNumber(sv.getPage())
                        .targetPageNumber(tv.getPage())
                        .sourceChunkIndex(sv.getChunkIndex())
                        .targetChunkIndex(tv.getChunkIndex())
                        .build());
                foundMeaningfulChange = true;
            }

            // Strategy B: 같은 기간 매칭에서 의미있는 변화를 못 찾으면,
            // 각 문서의 최신(마지막) 기간 값끼리 비교
            if (!foundMeaningfulChange) {
                // source의 마지막 기간, target의 마지막 기간
                DiscrepancyDetectionEngine.ExtractedValue sv = getLatestPeriodValue(sourceValues);
                DiscrepancyDetectionEngine.ExtractedValue tv = getLatestPeriodValue(targetValues);

                if (sv != null && tv != null
                        && sv.getNumericValue() != null && tv.getNumericValue() != null) {
                    // 같은 기간 + 같은 값이면 진짜 동일한 것 → 스킵
                    String sPeriod = sv.getPeriod() != null ? sv.getPeriod() : "N/A";
                    String tPeriod = tv.getPeriod() != null ? tv.getPeriod() : "N/A";

                    double sVal = sv.getNumericValue();
                    double tVal = tv.getNumericValue();
                    double changeAbsolute = tVal - sVal;

                    if (Math.abs(changeAbsolute) >= 0.001) {
                        Double changePercent = sVal != 0 ? (changeAbsolute / sVal) * 100 : null;
                        String direction = changeAbsolute > 0 ? "INCREASED" : changeAbsolute < 0 ? "DECREASED" : "UNCHANGED";

                        String periodLabel = sPeriod.equals(tPeriod) ? sPeriod : sPeriod + " → " + tPeriod;

                        log.info("[DiffEngine] Field '{}': cross-period match {} vs {} → change {}%",
                                field, sPeriod, tPeriod, changePercent);

                        changes.add(NumericChange.builder()
                                .field(field)
                                .period(periodLabel)
                                .sourceValue(sv.getValue())
                                .targetValue(tv.getValue())
                                .unit(sv.getUnit())
                                .changeAbsolute(changeAbsolute)
                                .changePercent(changePercent)
                                .direction(direction)
                                .sourcePageNumber(sv.getPage())
                                .targetPageNumber(tv.getPage())
                                .sourceChunkIndex(sv.getChunkIndex())
                                .targetChunkIndex(tv.getChunkIndex())
                                .build());
                    } else {
                        log.info("[DiffEngine] Field '{}': latest values identical (source {}={}, target {}={})",
                                field, sPeriod, sVal, tPeriod, tVal);
                    }
                }
            }
        }

        log.info("[DiffEngine] Found {} numeric changes between {} and {}", changes.size(), source.getId(), target.getId());
        return changes;
    }

    /**
     * 추출된 값 중 가장 최근 기간의 값을 반환.
     * 기간 문자열을 역순 정렬하여 가장 큰(최신) 기간 선택.
     */
    private DiscrepancyDetectionEngine.ExtractedValue getLatestPeriodValue(
            List<DiscrepancyDetectionEngine.ExtractedValue> values) {
        if (values.isEmpty()) return null;
        if (values.size() == 1) return values.get(0);

        // numericValue가 있는 값만 대상
        List<DiscrepancyDetectionEngine.ExtractedValue> valid = values.stream()
                .filter(v -> v.getNumericValue() != null)
                .toList();
        if (valid.isEmpty()) return null;

        // period 역순 정렬 (2024-Q2 > 2024-Q1 > 2023)
        return valid.stream()
                .max(Comparator.comparing(
                        v -> v.getPeriod() != null ? v.getPeriod() : "",
                        Comparator.naturalOrder()))
                .orElse(valid.get(0));
    }

    public List<TextChange> compareTextSections(Document source, Document target) {
        List<String> sourceSections = chunkRepo.findDistinctSectionTitlesByDocumentId(source.getId());
        List<String> targetSections = chunkRepo.findDistinctSectionTitlesByDocumentId(target.getId());

        Set<String> sourceSet = new LinkedHashSet<>(sourceSections);
        Set<String> targetSet = new LinkedHashSet<>(targetSections);

        List<TextChange> changes = new ArrayList<>();

        // target에만 있는 섹션 → ADDED
        for (String section : targetSections) {
            if (!sourceSet.contains(section)) {
                changes.add(TextChange.builder()
                        .type("ADDED")
                        .sectionTitle(section)
                        .summary("새로 추가된 섹션")
                        .build());
            }
        }

        // source에만 있는 섹션 → REMOVED
        for (String section : sourceSections) {
            if (!targetSet.contains(section)) {
                changes.add(TextChange.builder()
                        .type("REMOVED")
                        .sectionTitle(section)
                        .summary("삭제된 섹션")
                        .build());
            }
        }

        // 공통 섹션 → LLM 비교
        Set<String> commonSections = new LinkedHashSet<>(sourceSet);
        commonSections.retainAll(targetSet);

        for (String section : commonSections) {
            try {
                String sourceText = fetchSectionText(source.getId(), section);
                String targetText = fetchSectionText(target.getId(), section);

                if (sourceText.isBlank() || targetText.isBlank()) continue;

                String diff = compareSectionTexts(section, sourceText, targetText);
                if (diff != null && !diff.contains("변경 없음")) {
                    changes.add(TextChange.builder()
                            .type("MODIFIED")
                            .sectionTitle(section)
                            .summary(diff)
                            .build());
                }
            } catch (Exception e) {
                log.warn("[DiffEngine] Failed to compare section '{}': {}", section, e.getMessage());
            }
        }

        log.info("[DiffEngine] Found {} text changes between {} and {}", changes.size(), source.getId(), target.getId());
        return changes;
    }

    public DiffResultData buildFullResult(Document source, Document target) {
        List<NumericChange> numericChanges = compareNumericValues(source, target);
        List<TextChange> textChanges = compareTextSections(source, target);

        int added = (int) textChanges.stream().filter(c -> "ADDED".equals(c.getType())).count();
        int removed = (int) textChanges.stream().filter(c -> "REMOVED".equals(c.getType())).count();
        int modified = (int) textChanges.stream().filter(c -> "MODIFIED".equals(c.getType())).count()
                + numericChanges.size();
        int totalChanges = added + removed + modified;

        DiffSummary summary = DiffSummary.builder()
                .totalChanges(totalChanges)
                .added(added)
                .removed(removed)
                .modified(modified)
                .unchanged(0)
                .build();

        DiffMetadata metadata = DiffMetadata.builder()
                .sourceFilename(source.getOriginalFilename())
                .targetFilename(target.getOriginalFilename())
                .analysisModel("gpt-4.1-mini")
                .processedAt(LocalDateTime.now())
                .build();

        return DiffResultData.builder()
                .summary(summary)
                .numericChanges(numericChanges)
                .textChanges(textChanges)
                .metadata(metadata)
                .build();
    }

    // ── Private helpers ──

    private String fetchSectionText(UUID documentId, String sectionTitle) {
        SearchRequest request = SearchRequest.builder()
                .query(sectionTitle)
                .filters(SearchRequest.Filters.builder()
                        .documentIds(List.of(documentId))
                        .build())
                .limit(5)
                .build();

        SearchResponse response = searchService.search(request);
        if (response.getResults() == null || response.getResults().isEmpty()) {
            return "";
        }

        return response.getResults().stream()
                .map(SearchResult::getText)
                .filter(t -> t != null && !t.isBlank())
                .collect(Collectors.joining("\n"));
    }

    private String compareSectionTexts(String sectionTitle, String sourceText, String targetText) {
        String prompt = String.format("""
                다음 두 텍스트는 같은 섹션('%s')의 이전 버전과 새 버전입니다.
                의미적 차이를 한 문장으로 요약해주세요.
                변경 사항이 없으면 정확히 "변경 없음"이라고만 답하세요.

                [이전 버전]
                %s

                [새 버전]
                %s

                응답 (한 문장만):
                """, sectionTitle,
                sourceText.length() > 2000 ? sourceText.substring(0, 2000) : sourceText,
                targetText.length() > 2000 ? targetText.substring(0, 2000) : targetText);

        try {
            ChatRequest chatRequest = ChatRequest.builder()
                    .messages(List.of(
                            SystemMessage.from("문서 버전 비교 전문가입니다. 간결하게 답변하세요."),
                            UserMessage.from(prompt)))
                    .build();
            ChatResponse chatResponse = llm.chat(chatRequest);
            return chatResponse.aiMessage() != null ? chatResponse.aiMessage().text().trim() : null;
        } catch (Exception e) {
            log.warn("[DiffEngine] LLM comparison failed for section '{}': {}", sectionTitle, e.getMessage());
            return null;
        }
    }
}
