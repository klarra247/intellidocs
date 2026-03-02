package com.intellidocs.domain.agent.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AgentPromptsTest {

    @Test
    void systemMessage_isNotBlank() {
        assertThat(AgentPrompts.SYSTEM_MESSAGE).isNotBlank();
    }

    @Test
    void systemMessage_containsFinancialKeywords() {
        assertThat(AgentPrompts.SYSTEM_MESSAGE).contains("수익성", "안정성", "성장성", "효율성");
    }

    @Test
    void systemMessage_containsSourceFormat() {
        assertThat(AgentPrompts.SYSTEM_MESSAGE).contains("[", "p.");
    }

    @Test
    void systemMessage_containsNumericRules() {
        assertThat(AgentPrompts.SYSTEM_MESSAGE).contains("단위", "계산 과정", "증감");
    }

    @Test
    void systemMessage_containsTableDataRules() {
        assertThat(AgentPrompts.SYSTEM_MESSAGE).contains("표 작성 규칙");
        assertThat(AgentPrompts.SYSTEM_MESSAGE).contains("자료 미제공");
        assertThat(AgentPrompts.SYSTEM_MESSAGE).contains("[표 데이터]");
    }

    @Test
    void systemMessage_lengthIsReasonable() {
        int len = AgentPrompts.SYSTEM_MESSAGE.length();
        assertThat(len).isBetween(200, 3500);
    }
}
