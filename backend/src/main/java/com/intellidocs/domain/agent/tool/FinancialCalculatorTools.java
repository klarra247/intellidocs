package com.intellidocs.domain.agent.tool;

import com.intellidocs.domain.agent.dto.ToolEvent;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.Consumer;

@Component
public class FinancialCalculatorTools {

    private Consumer<ToolEvent> eventCallback;

    public void setEventCallback(Consumer<ToolEvent> callback) {
        this.eventCallback = callback;
    }

    private void emitEvent(ToolEvent event) {
        if (eventCallback != null) {
            eventCallback.accept(event);
        }
    }

    @Tool("두 수치의 증감률, 비율, 차이를 정확하게 계산한다. 수치 비교나 증감률 질문에 사용. LLM의 수학 능력에 의존하지 않고 정확한 계산을 보장한다")
    public String calculateChange(
            @P("기준값 (이전 값, 분모 역할)") double baseValue,
            @P("비교값 (이후 값, 분자 역할)") double compareValue,
            @P("계산 유형: growth_rate, difference, ratio, percentage_point_change") String calcType
    ) {
        emitEvent(ToolEvent.start("calculateChange", "증감률 계산 중..."));
        String result = switch (calcType) {
            case "growth_rate" -> {
                if (baseValue == 0) {
                    yield "계산 불가: 기준값이 0이므로 증감률을 계산할 수 없습니다.";
                }
                double rate = (compareValue - baseValue) / baseValue * 100;
                String direction = rate >= 0 ? "증가" : "감소";
                yield String.format("증감률: (%s - %s) / %s = %.1f%% (%s)",
                        formatNumber(compareValue), formatNumber(baseValue),
                        formatNumber(baseValue), rate, direction);
            }
            case "difference" -> {
                double diff = compareValue - baseValue;
                String direction = diff >= 0 ? "증가" : "감소";
                yield String.format("차이: %s - %s = %s (%s)",
                        formatNumber(compareValue), formatNumber(baseValue),
                        formatNumber(diff), direction);
            }
            case "ratio" -> {
                if (baseValue == 0) {
                    yield "계산 불가: 기준값이 0이므로 비율을 계산할 수 없습니다.";
                }
                double ratio = compareValue / baseValue;
                yield String.format("비율: %s / %s = %.1f배",
                        formatNumber(compareValue), formatNumber(baseValue), ratio);
            }
            case "percentage_point_change" -> {
                double change = compareValue - baseValue;
                String direction = change >= 0 ? "상승" : "하락";
                yield String.format("변동폭: %s - %s = %.1f%%p (%s)",
                        formatNumber(compareValue), formatNumber(baseValue),
                        change, direction);
            }
            default -> String.format(
                    "지원하지 않는 계산 유형: %s. 사용 가능한 유형: growth_rate, difference, ratio, percentage_point_change",
                    calcType);
        };
        emitEvent(ToolEvent.end("calculateChange", "계산 완료"));
        return result;
    }

    @Tool("여러 수치로 재무 지표를 계산한다. 부채비율, 유동비율, ROE, 영업이익률 등의 재무비율 계산에 사용")
    public String calculateFinancialRatio(
            @P("재무비율 유형: debt_ratio, current_ratio, roe, operating_margin, net_margin, asset_turnover") String ratioType,
            @P("분자 값") double numerator,
            @P("분모 값") double denominator
    ) {
        emitEvent(ToolEvent.start("calculateFinancialRatio", "재무비율 계산 중..."));
        if (denominator == 0) {
            emitEvent(ToolEvent.end("calculateFinancialRatio", "계산 완료"));
            return "계산 불가: 분모가 0이므로 재무비율을 계산할 수 없습니다.";
        }

        String result = switch (ratioType) {
            case "debt_ratio" -> {
                double value = numerator / denominator * 100;
                String interpretation;
                if (value < 100) {
                    interpretation = "100% 미만으로 안정적인 수준입니다.";
                } else if (value <= 200) {
                    interpretation = "100%~200% 사이로 보통 수준입니다.";
                } else {
                    interpretation = "200% 이상으로 높은 수준입니다.";
                }
                yield String.format("부채비율: %s / %s × 100 = %.1f%% — %s",
                        formatNumber(numerator), formatNumber(denominator), value, interpretation);
            }
            case "current_ratio" -> {
                double value = numerator / denominator * 100;
                String interpretation;
                if (value >= 200) {
                    interpretation = "200% 이상으로 양호한 수준입니다.";
                } else if (value >= 100) {
                    interpretation = "100%~200% 사이로 보통 수준입니다.";
                } else {
                    interpretation = "100% 미만으로 유동성 부족 우려가 있습니다.";
                }
                yield String.format("유동비율: %s / %s × 100 = %.1f%% — %s",
                        formatNumber(numerator), formatNumber(denominator), value, interpretation);
            }
            case "roe" -> {
                double value = numerator / denominator * 100;
                yield String.format("ROE: %s / %s × 100 = %.1f%%",
                        formatNumber(numerator), formatNumber(denominator), value);
            }
            case "operating_margin" -> {
                double value = numerator / denominator * 100;
                yield String.format("영업이익률: %s / %s × 100 = %.1f%%",
                        formatNumber(numerator), formatNumber(denominator), value);
            }
            case "net_margin" -> {
                double value = numerator / denominator * 100;
                yield String.format("순이익률: %s / %s × 100 = %.1f%%",
                        formatNumber(numerator), formatNumber(denominator), value);
            }
            case "asset_turnover" -> {
                double value = numerator / denominator;
                yield String.format("총자산회전율: %s / %s = %.1f회",
                        formatNumber(numerator), formatNumber(denominator), value);
            }
            default -> String.format(
                    "지원하지 않는 재무비율 유형: %s. 사용 가능한 유형: debt_ratio, current_ratio, roe, operating_margin, net_margin, asset_turnover",
                    ratioType);
        };
        emitEvent(ToolEvent.end("calculateFinancialRatio", "계산 완료"));
        return result;
    }

    @Tool("연도별 수치 리스트로 추세 분석을 수행한다. CAGR, 평균 성장률, 추세 방향을 계산한다")
    public String analyzeTrend(
            @P("연도별 수치 리스트 (시간순)") List<Double> values,
            @P("각 수치에 대응하는 라벨 리스트 (예: 연도)") List<String> labels,
            @P("분석 대상 지표명 (예: 매출액, 영업이익)") String metricName
    ) {
        emitEvent(ToolEvent.start("analyzeTrend", "추세 분석 중..."));
        if (values.size() != labels.size()) {
            emitEvent(ToolEvent.end("analyzeTrend", "분석 완료"));
            return String.format("오류: 수치 개수(%d)와 라벨 개수(%d)가 일치하지 않습니다.",
                    values.size(), labels.size());
        }

        if (values.size() < 2) {
            emitEvent(ToolEvent.end("analyzeTrend", "분석 완료"));
            return String.format("추세 분석을 위해서는 2개 이상의 데이터가 필요합니다. (현재 %d개)", values.size());
        }

        double first = values.getFirst();
        double last = values.getLast();
        int periods = values.size() - 1;

        // CAGR
        String cagrStr;
        if (first <= 0) {
            cagrStr = "계산 불가 (시작값이 0 이하)";
        } else {
            double cagr = (Math.pow(last / first, 1.0 / periods) - 1) * 100;
            cagrStr = String.format("%.1f%%", cagr);
        }

        // Average YoY growth rates
        double sumGrowth = 0;
        int validGrowthCount = 0;
        List<String> yoyDetails = new java.util.ArrayList<>();
        int increaseCount = 0;
        int decreaseCount = 0;

        for (int i = 1; i < values.size(); i++) {
            double prev = values.get(i - 1);
            double curr = values.get(i);
            double diff = curr - prev;

            if (diff > 0) increaseCount++;
            else if (diff < 0) decreaseCount++;

            if (prev != 0) {
                double growth = (curr - prev) / prev * 100;
                sumGrowth += growth;
                validGrowthCount++;
                yoyDetails.add(String.format("  %s→%s: %.1f%%", labels.get(i - 1), labels.get(i), growth));
            } else {
                yoyDetails.add(String.format("  %s→%s: 계산 불가 (이전값 0)", labels.get(i - 1), labels.get(i)));
            }
        }

        String avgGrowthStr;
        if (validGrowthCount > 0) {
            double avgGrowth = sumGrowth / validGrowthCount;
            avgGrowthStr = String.format("%.1f%%", avgGrowth);
        } else {
            avgGrowthStr = "계산 불가";
        }

        // Trend direction
        String trendDirection;
        if (increaseCount == periods) {
            trendDirection = "지속 증가";
        } else if (decreaseCount == periods) {
            trendDirection = "지속 감소";
        } else if (increaseCount > decreaseCount) {
            trendDirection = "증가 추세";
        } else if (decreaseCount > increaseCount) {
            trendDirection = "감소 추세";
        } else {
            trendDirection = "정체";
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("[ %s 추세 분석 ]\n", metricName));
        sb.append(String.format("기간: %s ~ %s (%d개 데이터)\n", labels.getFirst(), labels.getLast(), values.size()));
        sb.append(String.format("CAGR (연평균성장률): %s\n", cagrStr));
        sb.append(String.format("평균 전년대비 성장률: %s\n", avgGrowthStr));
        sb.append("전년대비 성장률:\n");
        for (String detail : yoyDetails) {
            sb.append(detail).append("\n");
        }
        sb.append(String.format("추세 방향: %s", trendDirection));

        emitEvent(ToolEvent.end("analyzeTrend", "분석 완료"));
        return sb.toString();
    }

    private String formatNumber(double value) {
        if (value == (long) value) {
            return String.valueOf((long) value);
        }
        return String.valueOf(value);
    }
}
