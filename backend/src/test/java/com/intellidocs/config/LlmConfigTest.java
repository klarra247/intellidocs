package com.intellidocs.config;

import dev.langchain4j.model.chat.ChatLanguageModel;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("local")
class LlmConfigTest {

    @Autowired
    private ChatLanguageModel chatLanguageModel;

    @Test
    void chatLanguageModel_beanIsNotNull() {
        assertThat(chatLanguageModel).isNotNull();
    }
}
