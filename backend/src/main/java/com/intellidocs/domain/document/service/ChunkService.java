package com.intellidocs.domain.document.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.document.dto.ChunkDto;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.entity.DocumentChunk;
import com.intellidocs.domain.document.entity.DocumentStatus;
import com.intellidocs.domain.document.repository.DocumentChunkRepository;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.infrastructure.qdrant.QdrantChunkRetrievalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChunkService {

    private static final int MAX_BULK_SIZE = 20;

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final QdrantChunkRetrievalService qdrantChunkRetrievalService;

    // TODO: JWT 구현 시 소유자 검증 추가

    @Transactional(readOnly = true)
    public ChunkDto.Response getChunk(UUID documentId, int chunkIndex) {
        if (chunkIndex < 0) {
            throw BusinessException.badRequest("유효하지 않은 청크 인덱스: " + chunkIndex);
        }

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> BusinessException.notFound("Document", documentId));

        if (document.getStatus() != DocumentStatus.INDEXED) {
            throw BusinessException.documentNotReady(documentId);
        }

        DocumentChunk chunk = chunkRepository.findByDocumentIdAndChunkIndex(documentId, chunkIndex)
                .orElseThrow(() -> BusinessException.notFound("Chunk", documentId + "/" + chunkIndex));

        Optional<String> text = qdrantChunkRetrievalService.getChunkText(documentId, chunkIndex);

        if (text.isPresent()) {
            return ChunkDto.Response.from(chunk, text.get());
        } else {
            return ChunkDto.Response.from(chunk, null, "Qdrant에서 텍스트를 조회할 수 없습니다");
        }
    }

    @Transactional(readOnly = true)
    public ChunkDto.BulkResponse getChunks(UUID documentId, List<Integer> indices) {
        if (indices == null || indices.isEmpty()) {
            throw BusinessException.badRequest("indices 파라미터가 필요합니다");
        }

        // 중복 제거 + 정렬
        List<Integer> uniqueIndices = indices.stream()
                .distinct()
                .sorted()
                .toList();

        // 음수 체크
        for (int idx : uniqueIndices) {
            if (idx < 0) {
                throw BusinessException.badRequest("유효하지 않은 청크 인덱스: " + idx);
            }
        }

        if (uniqueIndices.size() > MAX_BULK_SIZE) {
            throw BusinessException.tooManyChunks(uniqueIndices.size(), MAX_BULK_SIZE);
        }

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> BusinessException.notFound("Document", documentId));

        if (document.getStatus() != DocumentStatus.INDEXED) {
            throw BusinessException.documentNotReady(documentId);
        }

        // PostgreSQL bulk 조회
        List<DocumentChunk> chunks = chunkRepository.findByDocumentIdAndChunkIndexIn(documentId, uniqueIndices);
        Map<Integer, DocumentChunk> chunkMap = chunks.stream()
                .collect(Collectors.toMap(DocumentChunk::getChunkIndex, Function.identity()));

        // Qdrant bulk text 조회
        List<Integer> foundIndices = new ArrayList<>(chunkMap.keySet());
        Map<Integer, String> textMap = qdrantChunkRetrievalService.getChunkTexts(documentId, foundIndices);

        // found/notFound 분리
        List<ChunkDto.Response> foundChunks = new ArrayList<>();
        List<Integer> notFoundIndices = new ArrayList<>();

        for (int idx : uniqueIndices) {
            DocumentChunk chunk = chunkMap.get(idx);
            if (chunk == null) {
                notFoundIndices.add(idx);
            } else {
                String text = textMap.get(idx);
                if (text != null) {
                    foundChunks.add(ChunkDto.Response.from(chunk, text));
                } else {
                    foundChunks.add(ChunkDto.Response.from(chunk, null, "Qdrant에서 텍스트를 조회할 수 없습니다"));
                }
            }
        }

        return ChunkDto.BulkResponse.builder()
                .documentId(documentId)
                .chunks(foundChunks)
                .notFound(notFoundIndices)
                .build();
    }
}
