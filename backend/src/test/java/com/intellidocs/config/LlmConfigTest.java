package com.intellidocs.config;

import dev.langchain4j.model.anthropic.AnthropicChatModel;
import dev.langchain4j.model.chat.ChatLanguageModel;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.junit.jupiter.api.extension.ExtendWith;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = LlmConfig.class)
@TestPropertySource(properties = {
    "app.llm.provider=anthropic",
    "app.llm.anthropic.api-key=",
    "app.llm.anthropic.model=claude-sonnet-4-20250514",
    "app.llm.openai.api-key=",
    "app.llm.openai.model=gpt-4o"
})
class LlmConfigTest {

    @Autowired
    private ChatLanguageModel chatLanguageModel;

    @Test
    void chatLanguageModel_beanIsNotNull() {
        assertThat(chatLanguageModel).isNotNull();
    }

    @Test
    void chatLanguageModel_defaultsToAnthropicProvider() {
        assertThat(chatLanguageModel).isInstanceOf(AnthropicChatModel.class);
    }
}
