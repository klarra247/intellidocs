package com.intellidocs.domain.diff.controller;

import com.intellidocs.common.SecurityContextHelper;
import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.diff.dto.DiffDto;
import com.intellidocs.domain.diff.service.DiffAsyncExecutor;
import com.intellidocs.domain.diff.service.DiffService;
import com.intellidocs.domain.diff.service.DiffSseEmitterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents/diff")
@RequiredArgsConstructor
public class DiffController {

    private final DiffService diffService;
    private final DiffAsyncExecutor asyncExecutor;
    private final DiffSseEmitterService sseEmitterService;

    @PostMapping
    public ResponseEntity<ApiResponse<DiffDto.DiffResponse>> createManualDiff(
            @Valid @RequestBody DiffDto.DiffRequest request) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        DiffDto.DiffResponse response = diffService.createManualDiff(request, userId);
        asyncExecutor.execute(UUID.fromString(response.getDiffId().toString()));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @GetMapping(value = "/{diffId}/status", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeDiffStatus(@PathVariable UUID diffId) {
        return sseEmitterService.createEmitter(diffId);
    }

    @GetMapping("/{diffId}")
    public ResponseEntity<ApiResponse<DiffDto.DiffDetailResponse>> getDiffResult(@PathVariable UUID diffId) {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(diffService.getDiffResult(diffId, userId)));
    }
}
