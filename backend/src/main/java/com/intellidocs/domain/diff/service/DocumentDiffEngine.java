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
        // 1. 공통 수치 항목 식별
        List<String> fields = engine.identifyCommonFields(List.of(source, target));
        if (fields.isEmpty()) {
            log.info("[DiffEngine] No common numeric fields found between {} and {}", source.getId(), target.getId());
            return List.of();
        }

        // 2. 양쪽 문서에서 수치 추출
        Map<String, List<DiscrepancyDetectionEngine.ExtractedValue>> extracted =
                engine.extractValues(List.of(source, target), fields);

        // 3. 같은 field + period 매칭하여 변화량 계산
        List<NumericChange> changes = new ArrayList<>();
        for (Map.Entry<String, List<DiscrepancyDetectionEngine.ExtractedValue>> entry : extracted.entrySet()) {
            String field = entry.getKey();
            List<DiscrepancyDetectionEngine.ExtractedValue> values = entry.getValue();

            // source/target 분리
            Map<String, DiscrepancyDetectionEngine.ExtractedValue> sourceByPeriod = new LinkedHashMap<>();
            Map<String, DiscrepancyDetectionEngine.ExtractedValue> targetByPeriod = new LinkedHashMap<>();

            for (DiscrepancyDetectionEngine.ExtractedValue v : values) {
                String period = v.getPeriod() != null ? v.getPeriod() : "N/A";
                if (source.getId().toString().equals(v.getDocumentId())) {
                    sourceByPeriod.putIfAbsent(period, v);
                } else if (target.getId().toString().equals(v.getDocumentId())) {
                    targetByPeriod.putIfAbsent(period, v);
                }
            }

            // 매칭
            Set<String> allPeriods = new LinkedHashSet<>();
            allPeriods.addAll(sourceByPeriod.keySet());
            allPeriods.addAll(targetByPeriod.keySet());

            for (String period : allPeriods) {
                DiscrepancyDetectionEngine.ExtractedValue sv = sourceByPeriod.get(period);
                DiscrepancyDetectionEngine.ExtractedValue tv = targetByPeriod.get(period);

                if (sv == null || tv == null) continue;
                if (sv.getNumericValue() == null || tv.getNumericValue() == null) continue;

                double sVal = sv.getNumericValue();
                double tVal = tv.getNumericValue();
                double changeAbsolute = tVal - sVal;
                Double changePercent = sVal != 0 ? (changeAbsolute / sVal) * 100 : null;
                String direction = changeAbsolute > 0 ? "INCREASED" : changeAbsolute < 0 ? "DECREASED" : "UNCHANGED";

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
            }
        }

        log.info("[DiffEngine] Found {} numeric changes between {} and {}", changes.size(), source.getId(), target.getId());
        return changes;
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
