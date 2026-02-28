package com.intellidocs.domain.document.controller;

import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.document.dto.DocumentDto;
import com.intellidocs.domain.document.service.DocumentService;
import com.intellidocs.domain.document.service.DocumentSseEmitterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final DocumentSseEmitterService sseEmitterService;

    // TODO: JWT에서 userId 추출하도록 변경 (Phase 1에서는 임시 헤더 사용)
    private static final UUID TEMP_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    /**
     * 문서 업로드
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DocumentDto.UploadResponse>> upload(
            @RequestParam("file") MultipartFile file) {

        DocumentDto.UploadResponse response = documentService.upload(file, TEMP_USER_ID);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    /**
     * 문서 목록 조회
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DocumentDto.ListResponse>>> getDocuments() {
        return ResponseEntity.ok(ApiResponse.ok(documentService.getDocuments(TEMP_USER_ID)));
    }

    /**
     * 문서 상세 조회
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentDto.DetailResponse>> getDocument(
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(documentService.getDocument(id)));
    }

    /**
     * 문서 삭제
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable UUID id) {
        documentService.deleteDocument(id);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    /**
     * 문서 파싱 상태 구독 (SSE)
     */
    @GetMapping(value = "/{id}/status", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeStatus(@PathVariable UUID id) {
        return sseEmitterService.createEmitter(id);
    }
}