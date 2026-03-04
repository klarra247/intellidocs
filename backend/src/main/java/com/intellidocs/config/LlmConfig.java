package com.intellidocs.config;

import dev.langchain4j.model.anthropic.AnthropicChatModel;
import dev.langchain4j.model.anthropic.AnthropicStreamingChatModel;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Slf4j
@Configuration
public class LlmConfig {

    @Value("${app.llm.provider:anthropic}")
    private String provider;

    @Value("${app.llm.anthropic.api-key:}")
    private String anthropicKey;

    @Value("${app.llm.anthropic.model:claude-sonnet-4-20250514}")
    private String anthropicModel;

    @Value("${app.llm.openai.api-key:}")
    private String openaiKey;

    @Value("${app.llm.openai.model:gpt-4o}")
    private String openaiModel;

    /**
     * Always creates a non-null bean.
     * If the real API key is blank, a placeholder is used so the bean can be injected.
     * RagService validates the actual key before every LLM call.
     */
    @Bean
    @Primary
    public ChatLanguageModel chatLanguageModel() {
        if ("openai".equalsIgnoreCase(provider)) {
            String key = openaiKey.isBlank() ? "placeholder-key" : openaiKey;
            if (openaiKey.isBlank()) {
                log.warn("[LLM] OpenAI API key not set — bean created with placeholder. "
                       + "Set OPENAI_API_KEY before making LLM calls.");
            }
            log.info("[LLM] Provider=OpenAI, model={}", openaiModel);
            return OpenAiChatModel.builder()
                    .apiKey(key)
                    .modelName(openaiModel)
                    .temperature(0.3)
                    .maxTokens(2000)
                    .build();
        }
        // Default: Anthropic
        String key = anthropicKey.isBlank() ? "placeholder-key" : anthropicKey;
        if (anthropicKey.isBlank()) {
            log.warn("[LLM] Anthropic API key not set — bean created with placeholder. "
                   + "Set ANTHROPIC_API_KEY before making LLM calls.");
        }
        log.info("[LLM] Provider=Anthropic, model={}", anthropicModel);
        return AnthropicChatModel.builder()
                .apiKey(key)
                .modelName(anthropicModel)
                .temperature(0.3)
                .maxTokens(2000)
                .build();
    }

    /**
     * 리포트 생성 전용 모델 — JSON 구조 응답을 위해 maxTokens를 높게 설정.
     * 기본 chatLanguageModel(maxTokens=2000)으로는 구조화된 리포트 JSON이 잘림.
     */
    @Bean("reportChatLanguageModel")
    public ChatLanguageModel reportChatLanguageModel() {
        if ("openai".equalsIgnoreCase(provider)) {
            String key = openaiKey.isBlank() ? "placeholder-key" : openaiKey;
            return OpenAiChatModel.builder()
                    .apiKey(key)
                    .modelName(openaiModel)
                    .temperature(0.3)
                    .maxTokens(8192)
                    .build();
        }
        String key = anthropicKey.isBlank() ? "placeholder-key" : anthropicKey;
        return AnthropicChatModel.builder()
                .apiKey(key)
                .modelName(anthropicModel)
                .temperature(0.3)
                .maxTokens(8192)
                .build();
    }

    /**
     * 불일치 탐지 전용 모델 — 수치 추출 JSON 응답을 위해 maxTokens 4096.
     */
    @Bean("discrepancyChatLanguageModel")
    public ChatLanguageModel discrepancyChatLanguageModel() {
        if ("openai".equalsIgnoreCase(provider)) {
            String key = openaiKey.isBlank() ? "placeholder-key" : openaiKey;
            return OpenAiChatModel.builder()
                    .apiKey(key)
                    .modelName(openaiModel)
                    .temperature(0.1)
                    .maxTokens(4096)
                    .build();
        }
        String key = anthropicKey.isBlank() ? "placeholder-key" : anthropicKey;
        return AnthropicChatModel.builder()
                .apiKey(key)
                .modelName(anthropicModel)
                .temperature(0.1)
                .maxTokens(4096)
                .build();
    }

    @Bean
    public StreamingChatLanguageModel streamingChatLanguageModel() {
        if ("openai".equalsIgnoreCase(provider)) {
            String key = openaiKey.isBlank() ? "placeholder-key" : openaiKey;
            if (openaiKey.isBlank()) {
                log.warn("[LLM] OpenAI API key not set — streaming bean created with placeholder.");
            }
            log.info("[LLM-Streaming] Provider=OpenAI, model={}", openaiModel);
            return OpenAiStreamingChatModel.builder()
                    .apiKey(key)
                    .modelName(openaiModel)
                    .temperature(0.3)
                    .maxTokens(2000)
                    .build();
        }
        String key = anthropicKey.isBlank() ? "placeholder-key" : anthropicKey;
        if (anthropicKey.isBlank()) {
            log.warn("[LLM] Anthropic API key not set — streaming bean created with placeholder.");
        }
        log.info("[LLM-Streaming] Provider=Anthropic, model={}", anthropicModel);
        return AnthropicStreamingChatModel.builder()
                .apiKey(key)
                .modelName(anthropicModel)
                .temperature(0.3)
                .maxTokens(2000)
                .build();
    }
}
