package com.intellidocs.domain.document.controller;

import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.document.dto.ChunkDto;
import com.intellidocs.domain.document.service.ChunkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents/{documentId}/chunks")
@RequiredArgsConstructor
public class ChunkController {

    private final ChunkService chunkService;

    // TODO: JWT 구현 시 소유자 검증 추가

    @GetMapping("/{chunkIndex}")
    public ResponseEntity<ApiResponse<ChunkDto.Response>> getChunk(
            @PathVariable UUID documentId,
            @PathVariable int chunkIndex) {
        return ResponseEntity.ok(ApiResponse.ok(chunkService.getChunk(documentId, chunkIndex)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ChunkDto.BulkResponse>> getChunks(
            @PathVariable UUID documentId,
            @RequestParam List<Integer> indices) {
        return ResponseEntity.ok(ApiResponse.ok(chunkService.getChunks(documentId, indices)));
    }
}
