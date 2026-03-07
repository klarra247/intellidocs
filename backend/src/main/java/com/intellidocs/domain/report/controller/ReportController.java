package com.intellidocs.domain.report.controller;

import com.intellidocs.common.SecurityContextHelper;
import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.report.dto.ReportDto;
import com.intellidocs.domain.report.entity.Report;
import com.intellidocs.domain.report.entity.ReportStatus;
import com.intellidocs.domain.report.service.ReportAsyncExecutor;
import com.intellidocs.domain.report.service.ReportService;
import com.intellidocs.domain.report.service.ReportSseEmitterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final ReportAsyncExecutor asyncExecutor;
    private final ReportSseEmitterService sseEmitterService;

    /**
     * 리포트 생성 시작
     * createReport()이 @Transactional이므로, 리턴 후 커밋 완료된 상태에서 async 실행
     */
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<ReportDto.GenerateResponse>> generate(
            @Valid @RequestBody ReportDto.GenerateRequest request) {

        UUID userId = SecurityContextHelper.getCurrentUserId();
        ReportDto.GenerateResponse response = reportService.createReport(request, userId);
        asyncExecutor.execute(response.getReportId(), request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.ok(response));
    }

    /**
     * 리포트 진행률 SSE 스트림
     */
    @GetMapping(value = "/{id}/status", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeStatus(@PathVariable UUID id) {
        return sseEmitterService.createEmitter(id);
    }

    /**
     * PDF 다운로드
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID id) {
        Report report = reportService.getReport(id);

        if (report.getStatus() != ReportStatus.COMPLETED || report.getStoragePath() == null) {
            throw BusinessException.badRequest("리포트가 아직 완성되지 않았습니다.");
        }

        Path pdfPath = Path.of(report.getStoragePath());
        if (!Files.exists(pdfPath)) {
            throw BusinessException.notFound("Report PDF", id);
        }

        String encodedFilename = URLEncoder.encode(report.getTitle() + ".pdf", StandardCharsets.UTF_8)
                .replace("+", "%20");

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename*=UTF-8''" + encodedFilename)
                .body(new FileSystemResource(pdfPath));
    }

    /**
     * 리포트 삭제
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        reportService.deleteReport(id);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    /**
     * 리포트 목록 조회
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ReportDto.ListResponse>>> list() {
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(reportService.getReports(userId)));
    }
}
