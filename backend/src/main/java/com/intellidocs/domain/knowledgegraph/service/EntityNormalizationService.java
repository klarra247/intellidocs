package com.intellidocs.domain.knowledgegraph.service;

import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class EntityNormalizationService {

    private static final Map<String, String> ALIAS_MAP = new LinkedHashMap<>();

    static {
        // 회사명
        ALIAS_MAP.put("samsung electronics", "삼성전자");
        ALIAS_MAP.put("samsung", "삼성전자");
        ALIAS_MAP.put("삼성", "삼성전자");

        // 재무 지표
        ALIAS_MAP.put("revenue", "매출액");
        ALIAS_MAP.put("매출 실적", "매출액");
        ALIAS_MAP.put("매출", "매출액");

        ALIAS_MAP.put("operating profit", "영업이익");
        ALIAS_MAP.put("operating income", "영업이익");

        ALIAS_MAP.put("net income", "순이익");
        ALIAS_MAP.put("net profit", "순이익");
        ALIAS_MAP.put("당기순이익", "순이익");

        ALIAS_MAP.put("total assets", "총자산");
        ALIAS_MAP.put("total liabilities", "총부채");
    }

    public String normalize(String rawName) {
        if (rawName == null || rawName.isBlank()) {
            return "";
        }

        // 1단계: 공백/탭/줄바꿈 정리
        String cleaned = rawName.replaceAll("[\\t\\n\\r]+", "").trim();
        if (cleaned.isEmpty()) return "";

        // 2단계: 괄호 안 부연 설명 제거 — "매출액(연결기준)" → "매출액"
        cleaned = cleaned.replaceAll("\\([^)]*\\)", "").trim();
        if (cleaned.isEmpty()) return "";

        // 3단계: 별칭 매핑 (소문자 비교)
        String lower = cleaned.toLowerCase();
        for (Map.Entry<String, String> entry : ALIAS_MAP.entrySet()) {
            if (lower.equals(entry.getKey())) {
                return entry.getValue();
            }
        }

        return cleaned;
    }
}
