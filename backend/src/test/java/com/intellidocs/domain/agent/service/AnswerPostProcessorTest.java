package com.intellidocs.domain.agent.service;

import com.intellidocs.domain.agent.dto.AgentResponse;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AnswerPostProcessorTest {

    @Test
    void extractTables_normalTable_parsesHeadersAndRows() {
        String answer = """
                매출 데이터입니다:

                | 연도 | 매출 | 이익 |
                |------|------|------|
                | 2023 | 100억 | 10억 |
                | 2024 | 150억 | 20억 |

                이상입니다.
                """;

        List<AgentResponse.TableData> tables = AnswerPostProcessor.extractTables(answer);

        assertThat(tables).hasSize(1);
        assertThat(tables.get(0).getHeaders()).containsExactly("연도", "매출", "이익");
        assertThat(tables.get(0).getRows()).hasSize(2);
        assertThat(tables.get(0).getRows().get(0)).containsExactly("2023", "100억", "10억");
        assertThat(tables.get(0).getRows().get(1)).containsExactly("2024", "150억", "20억");
    }

    @Test
    void extractTables_noTable_returnsEmptyList() {
        String answer = "이 문서에는 표가 없습니다. 매출은 150억원입니다.";

        List<AgentResponse.TableData> tables = AnswerPostProcessor.extractTables(answer);

        assertThat(tables).isEmpty();
    }

    @Test
    void extractTables_multipleTables_extractsAll() {
        String answer = """
                첫 번째 표:

                | A | B |
                |---|---|
                | 1 | 2 |

                두 번째 표:

                | X | Y | Z |
                |---|---|---|
                | a | b | c |
                | d | e | f |
                """;

        List<AgentResponse.TableData> tables = AnswerPostProcessor.extractTables(answer);

        assertThat(tables).hasSize(2);
        assertThat(tables.get(0).getHeaders()).containsExactly("A", "B");
        assertThat(tables.get(1).getHeaders()).containsExactly("X", "Y", "Z");
        assertThat(tables.get(1).getRows()).hasSize(2);
    }

    @Test
    void extractTables_nullAnswer_returnsEmptyList() {
        assertThat(AnswerPostProcessor.extractTables(null)).isEmpty();
    }

    @Test
    void extractTables_blankAnswer_returnsEmptyList() {
        assertThat(AnswerPostProcessor.extractTables("   ")).isEmpty();
    }

    @Test
    void extractTables_malformedTable_returnsEmptyList() {
        String answer = """
                | 헤더만 있는 표
                |---
                일반 텍스트
                """;

        List<AgentResponse.TableData> tables = AnswerPostProcessor.extractTables(answer);

        assertThat(tables).isEmpty();
    }
}
