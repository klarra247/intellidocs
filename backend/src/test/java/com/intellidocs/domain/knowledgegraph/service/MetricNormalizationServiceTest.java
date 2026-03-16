package com.intellidocs.domain.knowledgegraph.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MetricNormalizationServiceTest {

    private MetricNormalizationService service;

    @BeforeEach
    void setUp() {
        service = new MetricNormalizationService();
    }

    @Test
    void 공백_특수문자_정규화() {
        assertThat(service.normalize("  매출액  ")).isEqualTo("매출액");
        assertThat(service.normalize("매출\t액")).isEqualTo("매출액");
    }

    @Test
    void 괄호_부연설명_제거() {
        assertThat(service.normalize("매출액(연결기준)")).isEqualTo("매출액");
        assertThat(service.normalize("영업이익(별도)")).isEqualTo("영업이익");
    }

    @Test
    void 한글_영문_별칭_매핑() {
        assertThat(service.normalize("Samsung")).isEqualTo("삼성전자");
        assertThat(service.normalize("삼성")).isEqualTo("삼성전자");
        assertThat(service.normalize("revenue")).isEqualTo("매출액");
        assertThat(service.normalize("매출")).isEqualTo("매출액");
        assertThat(service.normalize("매출 실적")).isEqualTo("매출액");
    }

    @Test
    void 매핑에_없는_이름은_정규화만() {
        assertThat(service.normalize("미쓰비시 UFJ 은행")).isEqualTo("미쓰비시 UFJ 은행");
    }

    @Test
    void null_빈문자열_처리() {
        assertThat(service.normalize(null)).isEqualTo("");
        assertThat(service.normalize("")).isEqualTo("");
        assertThat(service.normalize("   ")).isEqualTo("");
    }
}
