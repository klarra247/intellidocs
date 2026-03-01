package com.intellidocs.infrastructure.embedding;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
public class EmbeddingService {

    private static final String VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

    @Value("${app.llm.voyage.api-key:}")
    private String apiKey;

    @Value("${app.llm.voyage.model:voyage-3.5-lite}")
    private String modelName;

    private RestClient restClient;

    @PostConstruct
    void init() {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("[Embedding] Voyage AI API key not configured — embedding will be skipped. "
                    + "Set VOYAGE_API_KEY env var to enable vector search.");
            return;
        }
        restClient = RestClient.builder()
                .baseUrl(VOYAGE_API_URL)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
        log.info("[Embedding] Voyage AI initialized — model: '{}'", modelName);
    }

    /**
     * Voyage AI REST API를 호출해 텍스트 배치를 임베딩합니다.
     * API 키 미설정 또는 호출 실패 시 빈 리스트를 반환합니다.
     */
    public List<float[]> embedBatch(List<String> texts) {
        if (restClient == null) {
            log.warn("[Embedding] Model not initialized — skipping embedding for {} texts", texts.size());
            return List.of();
        }
        if (texts.isEmpty()) {
            return List.of();
        }
        try {
            VoyageRequest req = new VoyageRequest(modelName, texts, "document");
            VoyageResponse resp = restClient.post()
                    .body(req)
                    .retrieve()
                    .body(VoyageResponse.class);

            if (resp == null || resp.data() == null || resp.data().isEmpty()) {
                log.error("[Embedding] Empty response from Voyage AI");
                return List.of();
            }

            // index 순서 보장 후 float[] 변환
            return resp.data().stream()
                    .sorted(Comparator.comparingInt(VoyageEmbedding::index))
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

    private record VoyageRequest(String model, List<String> input, String input_type) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VoyageResponse(String object, List<VoyageEmbedding> data) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record VoyageEmbedding(String object, List<Double> embedding, int index) {}
}
