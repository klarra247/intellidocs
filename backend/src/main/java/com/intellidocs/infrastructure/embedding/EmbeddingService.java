package com.intellidocs.infrastructure.embedding;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.ClientHttpRequestFactories;
import org.springframework.boot.web.client.ClientHttpRequestFactorySettings;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
public class EmbeddingService {

    private static final String OPENAI_API_URL = "https://api.openai.com/v1/embeddings";

    @Value("${app.llm.openai.api-key:}")
    private String apiKey;

    @Value("${app.llm.openai.embedding-model:text-embedding-3-small}")
    private String modelName;

    private RestClient restClient;

    @PostConstruct
    void init() {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("[Embedding] OpenAI API key not configured — embedding will be skipped. "
                    + "Set OPENAI_API_KEY env var to enable vector search.");
            return;
        }
        var requestFactory = ClientHttpRequestFactories.get(
                ClientHttpRequestFactorySettings.DEFAULTS
                        .withConnectTimeout(Duration.ofSeconds(10))
                        .withReadTimeout(Duration.ofSeconds(30))
        );
        restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .baseUrl(OPENAI_API_URL)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
        log.info("[Embedding] OpenAI embedding initialized — model: '{}'", modelName);
    }

    /**
     * OpenAI Embeddings API를 호출해 텍스트 배치를 임베딩합니다.
     * API 키 미설정 또는 호출 실패 시 빈 리스트를 반환합니다.
     */
    private static final int BATCH_SIZE = 20;

    public List<float[]> embedBatch(List<String> texts) {
        if (restClient == null) {
            log.warn("[Embedding] Model not initialized — skipping embedding for {} texts", texts.size());
            return List.of();
        }
        if (texts.isEmpty()) {
            return List.of();
        }

        List<float[]> allEmbeddings = new java.util.ArrayList<>();
        for (int i = 0; i < texts.size(); i += BATCH_SIZE) {
            List<String> batch = texts.subList(i, Math.min(i + BATCH_SIZE, texts.size()));
            List<float[]> batchResult = embedSingleBatch(batch);
            if (batchResult.isEmpty()) {
                return List.of();
            }
            allEmbeddings.addAll(batchResult);
        }
        return allEmbeddings;
    }

    private List<float[]> embedSingleBatch(List<String> texts) {
        try {
            OpenAiEmbedRequest req = new OpenAiEmbedRequest(modelName, texts);
            OpenAiEmbedResponse resp = restClient.post()
                    .body(req)
                    .retrieve()
                    .body(OpenAiEmbedResponse.class);

            if (resp == null || resp.data() == null || resp.data().isEmpty()) {
                log.error("[Embedding] Empty response from OpenAI");
                return List.of();
            }

            return resp.data().stream()
                    .sorted(Comparator.comparingInt(OpenAiEmbedding::index))
                    .map(e -> toFloatArray(e.embedding()))
                    .toList();

        } catch (Exception e) {
            log.error("[Embedding] Batch embedding failed for {} texts: {}", texts.size(), e.getMessage(), e);
            return List.of();
        }
    }

    private float[] toFloatArray(List<Double> doubles) {
        float[] arr = new float[doubles.size()];
        for (int i = 0; i < doubles.size(); i++) {
            arr[i] = doubles.get(i).floatValue();
        }
        return arr;
    }

    // ── Request / Response DTOs ────────────────────────────────

    private record OpenAiEmbedRequest(String model, List<String> input) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record OpenAiEmbedResponse(String object, List<OpenAiEmbedding> data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record OpenAiEmbedding(String object, List<Double> embedding, int index) {}
}
