package com.intellidocs.domain.discrepancy.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidocs.domain.discrepancy.entity.DiscrepancyResultData;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.search.dto.SearchRequest;
import com.intellidocs.domain.search.dto.SearchResponse;
import com.intellidocs.domain.search.dto.SearchResult;
import com.intellidocs.domain.search.service.HybridSearchService;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Component
public class DiscrepancyDetectionEngine {

    private final ChatLanguageModel chatLanguageModel;
    private final HybridSearchService hybridSearchService;
    private final ObjectMapper objectMapper;

    private static final int MAX_RETRIES = 2;
    private static final int SEARCH_LIMIT = 10;
    private static final int TOP_CHUNKS_FOR_FIELD_IDENTIFICATION = 5;

    public DiscrepancyDetectionEngine(
            @Qualifier("discrepancyChatLanguageModel") ChatLanguageModel chatLanguageModel,
            HybridSearchService hybridSearchService,
            ObjectMapper objectMapper) {
        this.chatLanguageModel = chatLanguageModel;
        this.hybridSearchService = hybridSearchService;
        this.objectMapper = objectMapper;
    }

    // ── Stage 1: 공통 수치 항목 식별 ──

    public List<String> identifyCommonFields(List<Document> documents) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("다음은 여러 문서의 일부 내용입니다. 이 문서들에서 공통적으로 등장하는 수치 항목(숫자가 포함된 항목)을 찾아주세요.\n");
        prompt.append("항목명만 JSON 배열로 반환해주세요. 예: [\"매출\", \"영업이익\", \"유동자산\", \"부채비율\"]\n\n");

        for (Document doc : documents) {
            List<SearchResult> chunks = searchTopChunks(doc.getId(), doc.getOriginalFilename(), TOP_CHUNKS_FOR_FIELD_IDENTIFICATION);
            prompt.append(String.format("[문서: %s]\n", doc.getOriginalFilename()));
            for (SearchResult chunk : chunks) {
                if (chunk.getText() != null && !chunk.getText().isBlank()) {
                    prompt.append(chunk.getText()).append("\n");
                }
            }
            prompt.append("\n");
        }

        prompt.append("응답 형식 (JSON만, 다른 텍스트 없이):\n[\"항목1\", \"항목2\", ...]");

        String response = callLlmWithRetry(prompt.toString());
        List<String> fields = parseJsonArray(response);

        if (fields == null || fields.isEmpty()) {
            log.warn("[Discrepancy] Failed to identify common fields from LLM response");
            return List.of();
        }

        log.info("[Discrepancy] Identified {} common fields: {}", fields.size(), fields);
        return fields;
    }

    // ── Stage 2: 항목별 수치 추출 ──

    public Map<String, List<ExtractedValue>> extractValues(List<Document> documents, List<String> fields) {
        Map<String, List<ExtractedValue>> result = new LinkedHashMap<>();

        for (String field : fields) {
            List<ExtractedValue> allValues = new ArrayList<>();

            for (Document doc : documents) {
                List<ExtractedValue> values = extractFieldFromDocument(field, doc);
                allValues.addAll(values);
            }

            result.put(field, allValues);
        }

        return result;
    }

    private List<ExtractedValue> extractFieldFromDocument(String field, Document doc) {
        // 하이브리드 검색으로 관련 청크 가져오기
        SearchRequest searchRequest = SearchRequest.builder()
                .query(field)
                .filters(SearchRequest.Filters.builder()
                        .documentIds(List.of(doc.getId()))
                        .build())
                .limit(SEARCH_LIMIT)
                .build();

        SearchResponse searchResponse = hybridSearchService.search(searchRequest);
        List<SearchResult> chunks = searchResponse.getResults();

        if (chunks.isEmpty()) {
            log.debug("[Discrepancy] No chunks found for field '{}' in document '{}'", field, doc.getOriginalFilename());
            return List.of();
        }

        StringBuilder contextBuilder = new StringBuilder();
        for (SearchResult chunk : chunks) {
            if (chunk.getText() != null && !chunk.getText().isBlank()) {
                if (chunk.getPageNumber() != null && chunk.getPageNumber() > 0) {
                    contextBuilder.append(String.format("[페이지 %d]\n", chunk.getPageNumber()));
                }
                contextBuilder.append(chunk.getText()).append("\n\n");
            }
        }

        if (contextBuilder.isEmpty()) {
            return List.of();
        }

        String prompt = String.format("""
                다음 문서 내용에서 "%s"의 수치를 추출해주세요.
                연도/기간별로 구분해서 추출하세요.

                문서: %s
                내용:
                %s

                응답 형식 (JSON만, 다른 텍스트 없이):
                [
                  { "field": "%s", "period": "2023", "value": "452억", "numericValue": 45200000000, "unit": "원", "page": 5 }
                ]

                규칙:
                - period는 반드시 숫자만 사용 (예: "2023", "2023-Q1"). "년", "年", "year" 등 접미사를 붙이지 마세요.
                - 분기는 "2023-Q1" 형식으로 통일. "1분기 2023" → "2023-Q1"
                - 반기는 "2023-H1" 형식으로 통일.
                - 기간을 특정할 수 없으면 "N/A"로 설정.
                - numericValue는 반드시 기본 단위(원, 개, %% 등)로 변환. "452억" → 45200000000
                - %%는 그대로 숫자만 추출. "45%%" → 45
                - value는 원문 그대로 보존
                - page는 해당 수치가 나온 페이지 번호. [페이지 N] 태그를 참고. 알 수 없으면 null.
                - 수치를 찾을 수 없으면 빈 배열 [] 반환
                """, field, doc.getOriginalFilename(), contextBuilder, field);

        String response = callLlmWithRetry(prompt);
        List<ExtractedValue> values = parseExtractedValues(response);

        if (values == null) {
            return List.of();
        }

        log.info("[Discrepancy] Raw LLM extraction for field='{}', doc='{}': {}", field, doc.getOriginalFilename(), response);

        // 문서 정보 주입 + 페이지/청크 인덱스 매칭
        Integer fallbackPage = chunks.stream()
                .filter(c -> c.getPageNumber() != null)
                .map(SearchResult::getPageNumber)
                .findFirst().orElse(null);

        for (ExtractedValue v : values) {
            v.setDocumentId(doc.getId().toString());
            v.setFilename(doc.getOriginalFilename());
            v.setPeriod(normalizePeriod(v.getPeriod()));

            // LLM이 페이지를 반환하지 않은 경우 → value 텍스트가 포함된 청크에서 매칭
            if (v.getPage() == null && v.getValue() != null) {
                for (SearchResult chunk : chunks) {
                    if (chunk.getText() != null && chunk.getText().contains(v.getValue())) {
                        v.setPage(chunk.getPageNumber());
                        v.setChunkIndex(chunk.getChunkIndex());
                        break;
                    }
                }
            }
            // 그래도 없으면 첫 번째 청크 페이지 사용
            if (v.getPage() == null) {
                v.setPage(fallbackPage);
            }

            log.info("[Discrepancy] Extracted: field='{}', period='{}', value='{}', numericValue={}, page={}, doc='{}'",
                    v.getField(), v.getPeriod(), v.getValue(), v.getNumericValue(), v.getPage(), v.getFilename());
        }

        return values;
    }

    // ── Stage 3: 수치 비교 + 불일치 판정 ──

    public DiscrepancyResultData compare(Map<String, List<ExtractedValue>> extracted, double tolerance) {
        List<DiscrepancyResultData.Discrepancy> discrepancies = new ArrayList<>();
        List<String> checkedFields = new ArrayList<>();
        List<String> notes = new ArrayList<>();

        for (Map.Entry<String, List<ExtractedValue>> entry : extracted.entrySet()) {
            String field = entry.getKey();
            List<ExtractedValue> values = entry.getValue();
            checkedFields.add(field);

            if (values.isEmpty()) {
                notes.add(String.format("'%s' 항목을 문서에서 찾지 못했습니다.", field));
                continue;
            }

            log.info("[Discrepancy] Compare field='{}': {} values total", field, values.size());
            for (ExtractedValue v : values) {
                log.info("[Discrepancy]   -> period='{}', numericValue={}, doc='{}'",
                        v.getPeriod(), v.getNumericValue(), v.getFilename());
            }

            // 기간별로 그룹핑 (period가 null/blank이면 "N/A"로 대체)
            Map<String, List<ExtractedValue>> byPeriod = values.stream()
                    .collect(Collectors.groupingBy(
                            v -> (v.getPeriod() != null && !v.getPeriod().isBlank()) ? v.getPeriod() : "N/A",
                            LinkedHashMap::new, Collectors.toList()));

            for (Map.Entry<String, List<ExtractedValue>> periodEntry : byPeriod.entrySet()) {
                String period = periodEntry.getKey();
                List<ExtractedValue> periodValues = periodEntry.getValue();

                // 서로 다른 문서에서 온 값들만 비교
                Map<String, ExtractedValue> byDocId = new LinkedHashMap<>();
                for (ExtractedValue v : periodValues) {
                    byDocId.putIfAbsent(v.getDocumentId(), v);
                }

                if (byDocId.size() < 2) {
                    // 한 문서에만 존재하면 비교 불가 → 스킵
                    continue;
                }

                // 유효한 numericValue가 있는 것만 필터
                List<ExtractedValue> comparable = byDocId.values().stream()
                        .filter(v -> v.getNumericValue() != null)
                        .toList();

                if (comparable.size() < 2) {
                    log.info("[Discrepancy] Skipping field='{}' period='{}': only {} docs have numericValue",
                            field, period, comparable.size());
                    notes.add(String.format("'%s' (%s) 항목의 수치 변환에 실패하여 비교할 수 없습니다.", field, period));
                    continue;
                }

                log.info("[Discrepancy] Comparing field='{}' period='{}': {} docs", field, period, comparable.size());

                // 기준값: 첫 번째 문서의 수치
                ExtractedValue base = comparable.get(0);
                for (int i = 1; i < comparable.size(); i++) {
                    ExtractedValue other = comparable.get(i);

                    double v1 = base.getNumericValue();
                    double v2 = other.getNumericValue();

                    // 두 값 모두 0이면 일치
                    if (v1 == 0 && v2 == 0) {
                        log.info("[Discrepancy] field='{}' period='{}': both zero → MATCH", field, period);
                        continue;
                    }

                    boolean isPercentField = isPercentUnit(base.getUnit()) || isPercentUnit(other.getUnit());
                    double diffPercent;
                    String differenceText;

                    if (isPercentField) {
                        // % 항목은 절대 차이(%p)로 비교
                        double absDiff = Math.abs(v1 - v2);
                        diffPercent = absDiff;
                        differenceText = String.format("%.2f%%p", absDiff);

                        // tolerance는 비율(0.01 = 1%)이므로 %p 비교 시에도 동일 스케일로 변환
                        // tolerance=0.01 → 허용 %p = 0.01 * 100 = 1.0%p
                        double tolerancePercent = tolerance * 100;
                        log.info("[Discrepancy] field='{}' period='{}': v1={} vs v2={}, absDiff={}%p, tolerancePercent={}%p → {}",
                                field, period, v1, v2, absDiff, tolerancePercent,
                                absDiff > tolerancePercent ? "DISCREPANCY" : "MATCH");

                        if (absDiff <= tolerancePercent) continue;
                    } else {
                        double maxAbs = Math.max(Math.abs(v1), Math.abs(v2));
                        diffPercent = Math.abs(v1 - v2) / maxAbs;
                        differenceText = formatDifference(v1, v2);

                        log.info("[Discrepancy] field='{}' period='{}': v1={} vs v2={}, diffPercent={}%, tolerance={}% → {}",
                                field, period, v1, v2, diffPercent * 100, tolerance * 100,
                                diffPercent > tolerance ? "DISCREPANCY" : "MATCH");

                        if (diffPercent <= tolerance) continue;
                    }

                    String severity = determineSeverity(diffPercent, isPercentField);

                    List<DiscrepancyResultData.Entry> entries = new ArrayList<>();
                    for (ExtractedValue v : comparable) {
                        entries.add(DiscrepancyResultData.Entry.builder()
                                .documentId(v.getDocumentId())
                                .filename(v.getFilename())
                                .value(v.getValue())
                                .numericValue(v.getNumericValue())
                                .unit(v.getUnit())
                                .page(v.getPage())
                                .build());
                    }

                    discrepancies.add(DiscrepancyResultData.Discrepancy.builder()
                            .field(field)
                            .period(period)
                            .entries(entries)
                            .difference(differenceText)
                            .differencePercent(isPercentField ? diffPercent : diffPercent * 100)
                            .severity(severity)
                            .build());

                    break;
                }
            }
        }

        log.info("[Discrepancy] Total discrepancies found: {}, checkedFields: {}", discrepancies.size(), checkedFields.size());

        // Summary
        Map<String, Integer> bySeverity = new HashMap<>();
        for (DiscrepancyResultData.Discrepancy d : discrepancies) {
            bySeverity.merge(d.getSeverity(), 1, Integer::sum);
        }

        DiscrepancyResultData.Summary summary = DiscrepancyResultData.Summary.builder()
                .totalFieldsChecked(checkedFields.size())
                .discrepanciesFound(discrepancies.size())
                .bySeverity(bySeverity)
                .build();

        return DiscrepancyResultData.builder()
                .discrepancies(discrepancies)
                .checkedFields(checkedFields)
                .summary(summary)
                .build();
    }

    // ── LLM 호출 ──

    private String callLlmWithRetry(String userPrompt) {
        String systemPrompt = "당신은 문서에서 수치 데이터를 정확하게 추출하는 전문가입니다. "
                + "반드시 요청된 JSON 형식으로만 응답하세요. 설명이나 부연은 절대 포함하지 마세요.";

        Exception lastException = null;
        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                List<dev.langchain4j.data.message.ChatMessage> messages = List.of(
                        SystemMessage.from(systemPrompt),
                        UserMessage.from(userPrompt)
                );

                ChatRequest chatRequest = ChatRequest.builder()
                        .messages(messages)
                        .build();

                ChatResponse chatResponse = chatLanguageModel.chat(chatRequest);
                String text = chatResponse.aiMessage() != null ? chatResponse.aiMessage().text() : null;

                if (text == null || text.isBlank()) {
                    log.warn("[Discrepancy] Empty LLM response on attempt {}", attempt + 1);
                    continue;
                }

                return text.trim();
            } catch (Exception e) {
                lastException = e;
                log.warn("[Discrepancy] LLM call failed (attempt {}/{}): {}", attempt + 1, MAX_RETRIES + 1, e.getMessage());
            }
        }

        throw new RuntimeException("LLM 호출이 " + (MAX_RETRIES + 1) + "회 모두 실패했습니다: "
                + (lastException != null ? lastException.getMessage() : "unknown error"), lastException);
    }

    // ── JSON 파싱 ──

    private List<String> parseJsonArray(String response) {
        String json = extractJsonFromResponse(response);
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.warn("[Discrepancy] Failed to parse field list JSON: {}", e.getMessage());
            // 재시도: 대괄호 패턴 추출
            try {
                int start = json.indexOf('[');
                int end = json.lastIndexOf(']');
                if (start >= 0 && end > start) {
                    String extracted = json.substring(start, end + 1);
                    return objectMapper.readValue(extracted, new TypeReference<List<String>>() {});
                }
            } catch (Exception e2) {
                log.warn("[Discrepancy] Fallback JSON parse also failed: {}", e2.getMessage());
            }
            return null;
        }
    }

    private List<ExtractedValue> parseExtractedValues(String response) {
        String json = extractJsonFromResponse(response);
        try {
            return objectMapper.readValue(json, new TypeReference<List<ExtractedValue>>() {});
        } catch (Exception e) {
            log.warn("[Discrepancy] Failed to parse extracted values JSON: {}", e.getMessage());
            try {
                int start = json.indexOf('[');
                int end = json.lastIndexOf(']');
                if (start >= 0 && end > start) {
                    String extracted = json.substring(start, end + 1);
                    return objectMapper.readValue(extracted, new TypeReference<List<ExtractedValue>>() {});
                }
            } catch (Exception e2) {
                log.warn("[Discrepancy] Fallback extracted values parse also failed: {}", e2.getMessage());
            }
            return null;
        }
    }

    /**
     * LLM 응답에서 JSON 부분만 추출. 마크다운 코드블록(```json ... ```) 처리 포함.
     */
    private String extractJsonFromResponse(String response) {
        if (response == null) return "[]";
        String trimmed = response.trim();

        // ```json ... ``` 패턴 처리
        if (trimmed.contains("```")) {
            int start = trimmed.indexOf("```");
            int contentStart = trimmed.indexOf('\n', start);
            int end = trimmed.indexOf("```", contentStart);
            if (contentStart >= 0 && end > contentStart) {
                return trimmed.substring(contentStart + 1, end).trim();
            }
        }

        return trimmed;
    }

    // ── 헬퍼 ──

    private List<SearchResult> searchTopChunks(UUID documentId, String filename, int limit) {
        try {
            SearchRequest request = SearchRequest.builder()
                    .query(filename)
                    .filters(SearchRequest.Filters.builder()
                            .documentIds(List.of(documentId))
                            .build())
                    .limit(limit)
                    .build();
            return hybridSearchService.search(request).getResults();
        } catch (Exception e) {
            log.warn("[Discrepancy] Failed to fetch top chunks for document {}: {}", documentId, e.getMessage());
            return List.of();
        }
    }

    private String normalizePeriod(String period) {
        if (period == null || period.isBlank()) return null;

        String normalized = period.trim()
                .replaceAll("[년年]$", "")
                .replaceAll("(?i)\\s*year$", "")
                .trim();

        // 분기: "2023 Q1", "2023년 1분기", "1Q 2023" 등 → "2023-Q1"
        Matcher qm = Pattern.compile("(\\d{4}).*?[Qq분기]\\s*(\\d)").matcher(normalized);
        if (qm.find()) {
            return qm.group(1) + "-Q" + qm.group(2);
        }
        Matcher qm2 = Pattern.compile("(\\d)\\s*[Qq분기].*?(\\d{4})").matcher(normalized);
        if (qm2.find()) {
            return qm2.group(2) + "-Q" + qm2.group(1);
        }

        // 반기: "2023 H1", "2023 상반기" 등 → "2023-H1"
        Matcher hm = Pattern.compile("(\\d{4}).*?[Hh]\\s*(\\d)").matcher(normalized);
        if (hm.find()) {
            return hm.group(1) + "-H" + hm.group(2);
        }
        Matcher hm2 = Pattern.compile("(\\d{4}).*?([상하])반기").matcher(normalized);
        if (hm2.find()) {
            return hm2.group(1) + "-H" + ("상".equals(hm2.group(2)) ? "1" : "2");
        }

        // "FY2023" → "2023"
        normalized = normalized.replaceAll("(?i)^FY\\s*", "");

        return normalized;
    }

    private boolean isPercentUnit(String unit) {
        return unit != null && (unit.equals("%") || unit.equals("%%") || unit.contains("퍼센트") || unit.contains("%p"));
    }

    private String determineSeverity(double diffPercent, boolean isPercentField) {
        if (isPercentField) {
            // %p 단위 — 절대값으로 판정
            if (diffPercent <= 0.5) return "INFO";
            if (diffPercent <= 5.0) return "WARNING";
            return "CRITICAL";
        }
        // 비율 단위
        if (diffPercent <= 0.005) return "INFO";
        if (diffPercent <= 0.05) return "WARNING";
        return "CRITICAL";
    }

    private String formatDifference(double v1, double v2) {
        double diff = v1 - v2;
        double absDiff = Math.abs(diff);

        if (absDiff >= 1_000_000_000_000L) {
            return String.format("%.1f조", diff / 1_000_000_000_000.0);
        } else if (absDiff >= 100_000_000) {
            return String.format("%.1f억", diff / 100_000_000.0);
        } else if (absDiff >= 10_000) {
            return String.format("%.1f만", diff / 10_000.0);
        }
        return String.format("%.2f", diff);
    }

    // ── 내부 DTO ──

    @Getter
    @Setter
    public static class ExtractedValue {
        private String field;
        private String period;
        private String value;
        private Double numericValue;
        private String unit;
        private String documentId;
        private String filename;
        private Integer page;
        private Integer chunkIndex;
    }
}
