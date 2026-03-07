package com.intellidocs.infrastructure.qdrant;

import io.qdrant.client.QdrantClient;
import io.qdrant.client.grpc.JsonWithInt;
import io.qdrant.client.grpc.Points.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

import static io.qdrant.client.ConditionFactory.matchKeyword;

@Slf4j
@Service
@RequiredArgsConstructor
public class QdrantChunkRetrievalService {

    private final QdrantClient qdrantClient;

    @Value("${app.qdrant.collection-name}")
    private String collectionName;

    public Optional<String> getChunkText(UUID documentId, int chunkIndex) {
        try {
            Filter filter = Filter.newBuilder()
                    .addMust(matchKeyword("document_id", documentId.toString()))
                    .addMust(io.qdrant.client.ConditionFactory.match("chunk_index", (long) chunkIndex))
                    .build();

            ScrollPoints request = ScrollPoints.newBuilder()
                    .setCollectionName(collectionName)
                    .setFilter(filter)
                    .setLimit(1)
                    .setWithPayload(WithPayloadSelector.newBuilder().setEnable(true).build())
                    .build();

            List<RetrievedPoint> results = qdrantClient.scrollAsync(request).get().getResultList();

            if (results.isEmpty()) {
                return Optional.empty();
            }

            return Optional.ofNullable(getStr(results.get(0).getPayloadMap(), "text"));

        } catch (Exception e) {
            log.error("[Qdrant] Failed to retrieve chunk text: documentId={}, chunkIndex={}", documentId, chunkIndex, e);
            return Optional.empty();
        }
    }

    public Map<Integer, String> getChunkTexts(UUID documentId, List<Integer> indices) {
        Map<Integer, String> result = new HashMap<>();
        if (indices == null || indices.isEmpty()) {
            return result;
        }

        try {
            List<Long> longIndices = indices.stream().map(Integer::longValue).toList();

            Filter filter = Filter.newBuilder()
                    .addMust(matchKeyword("document_id", documentId.toString()))
                    .addMust(io.qdrant.client.ConditionFactory.matchValues("chunk_index", longIndices))
                    .build();

            ScrollPoints request = ScrollPoints.newBuilder()
                    .setCollectionName(collectionName)
                    .setFilter(filter)
                    .setLimit(indices.size())
                    .setWithPayload(WithPayloadSelector.newBuilder().setEnable(true).build())
                    .build();

            List<RetrievedPoint> results = qdrantClient.scrollAsync(request).get().getResultList();

            for (RetrievedPoint point : results) {
                Map<String, JsonWithInt.Value> payload = point.getPayloadMap();
                int chunkIndex = (int) getLong(payload, "chunk_index");
                String text = getStr(payload, "text");
                if (text != null) {
                    result.put(chunkIndex, text);
                }
            }

        } catch (Exception e) {
            log.error("[Qdrant] Failed to retrieve chunk texts: documentId={}, indices={}", documentId, indices, e);
        }

        return result;
    }

    private String getStr(Map<String, JsonWithInt.Value> payload, String key) {
        JsonWithInt.Value v = payload.get(key);
        if (v == null || v.getKindCase() != JsonWithInt.Value.KindCase.STRING_VALUE) return null;
        return v.getStringValue();
    }

    private long getLong(Map<String, JsonWithInt.Value> payload, String key) {
        JsonWithInt.Value v = payload.get(key);
        if (v == null || v.getKindCase() != JsonWithInt.Value.KindCase.INTEGER_VALUE) return 0L;
        return v.getIntegerValue();
    }
}
