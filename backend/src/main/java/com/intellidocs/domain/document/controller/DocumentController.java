package com.intellidocs.domain.document.controller;

import com.intellidocs.common.SecurityContextHelper;
import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.document.dto.DocumentDto;
import com.intellidocs.domain.document.dto.ReviewStatusDto;
import com.intellidocs.domain.document.service.DocumentReviewService;
import com.intellidocs.domain.document.service.DocumentService;
import com.intellidocs.domain.document.service.DocumentSseEmitterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final DocumentSseEmitterService sseEmitterService;
    private final DocumentReviewService reviewService;

    /**
     * 문서 업로드
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DocumentDto.UploadResponse>> upload(
            @RequestParam("file") MultipartFile file) {

        UUID userId = SecurityContextHelper.getCurrentUserId();
        DocumentDto.UploadResponse response = documentService.upload(file, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    /**
     * 문서 목록 조회 (페이지네이션)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<DocumentDto.PageResponse>> getDocuments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, Math.min(size, 200));
        return ResponseEntity.ok(ApiResponse.ok(documentService.getDocumentsPaged(userId, pageable)));
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
     * 문서 원본 파일 스트리밍
     */
    @GetMapping("/{id}/file")
    public ResponseEntity<StreamingResponseBody> getFile(@PathVariable UUID id) {
        return documentService.streamFile(id);
    }

    /**
     * Excel 문서 미리보기 (JSON)
     */
    @GetMapping("/{id}/preview")
    public ResponseEntity<ApiResponse<Object>> getPreview(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(documentService.getPreview(id)));
    }

    /**
     * 문서 파싱 상태 구독 (SSE)
     */
    @GetMapping(value = "/{id}/status", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeStatus(@PathVariable UUID id) {
        return sseEmitterService.createEmitter(id);
    }

    /**
     * 리뷰 요청
     */
    @PostMapping("/{id}/review-request")
    public ResponseEntity<ApiResponse<ReviewStatusDto.ReviewResponse>> requestReview(
            @PathVariable UUID id) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(reviewService.requestReview(id, userId)));
    }

    /**
     * 리뷰 제출 (승인/거절)
     */
    @PatchMapping("/{id}/review")
    public ResponseEntity<ApiResponse<ReviewStatusDto.ReviewResponse>> submitReview(
            @PathVariable UUID id,
            @Valid @RequestBody ReviewStatusDto.ReviewRequest request) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(reviewService.submitReview(id, request.status(), userId)));
    }

    /**
     * 리뷰 상태 조회
     */
    @GetMapping("/{id}/review")
    public ResponseEntity<ApiResponse<ReviewStatusDto.ReviewResponse>> getReviewStatus(
            @PathVariable UUID id) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(reviewService.getReviewStatus(id, userId)));
    }
}