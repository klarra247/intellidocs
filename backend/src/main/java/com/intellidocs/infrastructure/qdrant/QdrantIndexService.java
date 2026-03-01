package com.intellidocs.infrastructure.qdrant;

import com.intellidocs.infrastructure.rabbitmq.ParsingMessage;
import io.qdrant.client.QdrantClient;
import io.qdrant.client.grpc.Collections.CollectionInfo;
import io.qdrant.client.grpc.Collections.Distance;
import io.qdrant.client.grpc.Collections.VectorParams;
import io.qdrant.client.grpc.JsonWithInt;
import io.qdrant.client.grpc.Points.Filter;
import io.qdrant.client.grpc.Points.PointStruct;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static io.qdrant.client.ConditionFactory.matchKeyword;
import static io.qdrant.client.PointIdFactory.id;
import static io.qdrant.client.ValueFactory.value;
import static io.qdrant.client.VectorsFactory.vectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class QdrantIndexService {

    private static final int VECTOR_DIMENSION = 1024;  // voyage-3.5-lite 기본 출력 차원

    private final QdrantClient qdrantClient;

    @Value("${app.qdrant.collection-name}")
    private String collectionName;

    /**
     * 애플리케이션 시작 시 컬렉션이 존재하는지 확인하고:
     *  - 없으면 생성
     *  - 있는데 차원이 다르면 (예: 이전에 다른 모델을 쓴 경우) 삭제 후 재생성
     *  - 있고 차원이 같으면 그대로 사용
     */
    @PostConstruct
    public void initCollection() {
        try {
            List<String> existing = qdrantClient.listCollectionsAsync().get();
            if (existing.contains(collectionName)) {
                CollectionInfo info = qdrantClient.getCollectionInfoAsync(collectionName).get();
                long existingDim = info.getConfig().getParams()
                        .getVectorsConfig().getParams().getSize();

                if (existingDim == VECTOR_DIMENSION) {
                    log.info("[Qdrant] Collection '{}' already exists (dim={})", collectionName, VECTOR_DIMENSION);
                    return;
                }

                log.warn("[Qdrant] Collection '{}' dimension mismatch: existing={}, expected={}. Recreating...",
                        collectionName, existingDim, VECTOR_DIMENSION);
                qdrantClient.deleteCollectionAsync(collectionName).get();
            }

            qdrantClient.createCollectionAsync(
                    collectionName,
                    VectorParams.newBuilder()
                            .setSize(VECTOR_DIMENSION)
                            .setDistance(Distance.Cosine)
                            .build()
            ).get();
            log.info("[Qdrant] Created collection '{}' (dim={}, distance=Cosine)",
                    collectionName, VECTOR_DIMENSION);
        } catch (Exception e) {
            log.error("[Qdrant] Failed to initialize collection '{}' — vector search will be unavailable: {}",
                    collectionName, e.getMessage());
        }
    }

    /**
     * Upserts chunk vectors with payload into Qdrant.
     * chunks and embeddings must have the same size.
     */
    public void indexChunks(
            UUID documentId,
            String originalFilename,
            String fileType,
            List<ParsingMessage.ChunkData> chunks,
            List<float[]> embeddings
    ) {
        if (chunks.size() != embeddings.size()) {
            throw new IllegalArgumentException(String.format(
                    "chunks(%d) and embeddings(%d) size mismatch", chunks.size(), embeddings.size()
            ));
        }

        List<PointStruct> points = new ArrayList<>(chunks.size());
        for (int i = 0; i < chunks.size(); i++) {
            ParsingMessage.ChunkData chunk = chunks.get(i);
            float[] vector = embeddings.get(i);

            Map<String, JsonWithInt.Value> payload = new HashMap<>();
            payload.put("document_id", value(documentId.toString()));
            payload.put("chunk_index", value((long) chunk.getChunkIndex()));
            payload.put("text", value(chunk.getText()));
            payload.put("page_number", value((long) (chunk.getPageNumber() != null ? chunk.getPageNumber() : 0)));
            payload.put("filename", value(originalFilename));
            payload.put("file_type", value(fileType));
            payload.put("chunk_type", value(chunk.getChunkType()));
            if (chunk.getSectionTitle() != null) {
                payload.put("section_title", value(chunk.getSectionTitle()));
            }

            points.add(PointStruct.newBuilder()
                    .setId(id(UUID.randomUUID()))
                    .setVectors(vectors(vector))
                    .putAllPayload(payload)
                    .build());
        }

        try {
            qdrantClient.upsertAsync(collectionName, points).get();
            log.info("[Qdrant] Indexed {} chunks for document {}", points.size(), documentId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to upsert points to Qdrant for document " + documentId, e);
        }
    }

    /**
     * Deletes all vectors belonging to a document, identified by the document_id payload field.
     */
    public void deleteByDocumentId(UUID documentId) {
        try {
            Filter filter = Filter.newBuilder()
                    .addMust(matchKeyword("document_id", documentId.toString()))
                    .build();
            qdrantClient.deleteAsync(collectionName, filter).get();
            log.info("[Qdrant] Deleted vectors for document {}", documentId);
        } catch (Exception e) {
            log.error("[Qdrant] Failed to delete vectors for document {}: {}", documentId, e.getMessage(), e);
        }
    }
}