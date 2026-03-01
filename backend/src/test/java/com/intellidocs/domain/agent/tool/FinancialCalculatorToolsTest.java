package com.intellidocs.domain.agent.tool;

import com.intellidocs.domain.agent.dto.ToolEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FinancialCalculatorToolsTest {

    private FinancialCalculatorTools calculator;

    @BeforeEach
    void setUp() {
        calculator = new FinancialCalculatorTools();
    }

    // === calculateChange tests ===

    @Test
    void calculateChange_growthRate_returnsPercentage() {
        String result = calculator.calculateChange(385, 452, "growth_rate");
        assertThat(result).contains("17.4%");
    }

    @Test
    void calculateChange_difference_returnsAbsolute() {
        String result = calculator.calculateChange(385, 452, "difference");
        assertThat(result).contains("67");
    }

    @Test
    void calculateChange_ratio_returnsRatio() {
        String result = calculator.calculateChange(200, 400, "ratio");
        assertThat(result).contains("2.0");
    }

    @Test
    void calculateChange_percentagePointChange_returnsPoints() {
        String result = calculator.calculateChange(15.5, 18.3, "percentage_point_change");
        assertThat(result).contains("2.8");
    }

    @Test
    void calculateChange_baseZero_handlesGracefully() {
        String result = calculator.calculateChange(0, 100, "growth_rate");
        assertThat(result).contains("계산 불가");
    }

    @Test
    void calculateChange_unknownType_returnsError() {
        String result = calculator.calculateChange(100, 200, "invalid_type");
        assertThat(result).contains("지원하지 않는");
    }

    // === calculateFinancialRatio tests ===

    @Test
    void calculateFinancialRatio_debtRatio_returnsPercentWithInterpretation() {
        String result = calculator.calculateFinancialRatio("debt_ratio", 201, 385);
        assertThat(result).contains("52.2%");
        assertThat(result).contains("100% 미만");
    }

    @Test
    void calculateFinancialRatio_debtRatio_highValue() {
        String result = calculator.calculateFinancialRatio("debt_ratio", 500, 200);
        assertThat(result).contains("250.0%");
        assertThat(result).contains("200% 이상");
    }

    @Test
    void calculateFinancialRatio_currentRatio_healthy() {
        String result = calculator.calculateFinancialRatio("current_ratio", 300, 150);
        assertThat(result).contains("200.0%");
    }

    @Test
    void calculateFinancialRatio_operatingMargin() {
        String result = calculator.calculateFinancialRatio("operating_margin", 79, 452);
        assertThat(result).contains("17.5%");
    }

    @Test
    void calculateFinancialRatio_zeroDenominator() {
        String result = calculator.calculateFinancialRatio("debt_ratio", 100, 0);
        assertThat(result).contains("계산 불가");
    }

    @Test
    void calculateFinancialRatio_unknownType() {
        String result = calculator.calculateFinancialRatio("unknown", 100, 200);
        assertThat(result).contains("지원하지 않는");
    }

    // === analyzeTrend tests ===

    @Test
    void analyzeTrend_growingValues_returnsIncreasingTrend() {
        String result = calculator.analyzeTrend(
                List.of(320.0, 385.0, 452.0),
                List.of("2022", "2023", "2024"),
                "매출액"
        );
        assertThat(result).contains("CAGR");
        assertThat(result).contains("18.9%");
        assertThat(result).contains("증가");
    }

    @Test
    void analyzeTrend_decliningValues_returnsDecreasingTrend() {
        String result = calculator.analyzeTrend(
                List.of(500.0, 400.0, 300.0),
                List.of("2022", "2023", "2024"),
                "영업이익"
        );
        assertThat(result).contains("감소");
    }

    @Test
    void analyzeTrend_singleValue_returnsInsufficientData() {
        String result = calculator.analyzeTrend(
                List.of(100.0),
                List.of("2024"),
                "매출"
        );
        assertThat(result).contains("2개 이상");
    }

    @Test
    void analyzeTrend_mismatchedSizes_returnsError() {
        String result = calculator.analyzeTrend(
                List.of(100.0, 200.0),
                List.of("2022"),
                "매출"
        );
        assertThat(result).contains("일치하지 않");
    }

    @Test
    void calculateChange_emitsToolEvents() {
        List<ToolEvent> events = new ArrayList<>();
        FinancialCalculatorTools tools = new FinancialCalculatorTools();
        tools.setEventCallback(events::add);

        tools.calculateChange(100, 150, "growth_rate");

        assertThat(events).hasSize(2);
        assertThat(events.get(0).getEventType()).isEqualTo("tool_start");
        assertThat(events.get(1).getEventType()).isEqualTo("tool_end");
    }
}
