package com.intellidocs.domain.discrepancy.controller;

import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.discrepancy.dto.DiscrepancyDto;
import com.intellidocs.domain.discrepancy.entity.DiscrepancyResult;
import com.intellidocs.domain.discrepancy.entity.TriggerType;
import com.intellidocs.domain.discrepancy.service.DiscrepancyAsyncExecutor;
import com.intellidocs.domain.discrepancy.service.DiscrepancyService;
import com.intellidocs.domain.discrepancy.service.DiscrepancySseEmitterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/discrepancies")
@RequiredArgsConstructor
public class DiscrepancyController {

    private final DiscrepancyService discrepancyService;
    private final DiscrepancyAsyncExecutor asyncExecutor;
    private final DiscrepancySseEmitterService sseEmitterService;

    @PostMapping("/detect")
    public ResponseEntity<ApiResponse<DiscrepancyDto.DetectResponse>> detect(
            @Valid @RequestBody DiscrepancyDto.DetectRequest request) {
        DiscrepancyDto.DetectResponse response = discrepancyService.createJob(request);
        asyncExecutor.execute(response.getJobId());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.ok(response));
    }

    @GetMapping(value = "/{id}/status", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamStatus(@PathVariable UUID id) {
        return sseEmitterService.createEmitter(id);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DiscrepancyDto.ResultResponse>> getResult(@PathVariable UUID id) {
        DiscrepancyResult result = discrepancyService.getResult(id);
        return ResponseEntity.ok(ApiResponse.ok(DiscrepancyDto.ResultResponse.from(result)));
    }

    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<DiscrepancyDto.ResultResponse>>> getRecent(
            @RequestParam(required = false) TriggerType triggerType) {
        List<DiscrepancyDto.ResultResponse> responses = discrepancyService.getRecent(triggerType)
                .stream()
                .map(DiscrepancyDto.ResultResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(responses));
    }
}
