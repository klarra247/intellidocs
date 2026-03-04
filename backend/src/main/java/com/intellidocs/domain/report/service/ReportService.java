package com.intellidocs.domain.report.service;

import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.domain.agent.service.IntelliDocsAgent;
import com.intellidocs.domain.agent.tool.DocumentQueryTools;
import com.intellidocs.domain.agent.tool.FinancialCalculatorTools;
import com.intellidocs.domain.discrepancy.service.DiscrepancyService;
import com.intellidocs.domain.document.entity.Document;
import com.intellidocs.domain.document.repository.DocumentRepository;
import com.intellidocs.domain.report.dto.ReportDto;
import com.intellidocs.domain.report.entity.Report;
import com.intellidocs.domain.report.entity.ReportData;
import com.intellidocs.domain.report.entity.ReportStatus;
import com.intellidocs.domain.report.entity.ReportType;
import com.intellidocs.domain.report.repository.ReportRepository;
import com.intellidocs.domain.search.service.HybridSearchService;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.service.AiServices;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.intellidocs.domain.document.entity.DocumentStatus;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ReportService {

    private final ReportRepository reportRepository;
    private final DocumentRepository documentRepository;
    private final ChatLanguageModel chatLanguageModel;
    private final HybridSearchService hybridSearchService;
    private final ReportPdfRenderer reportPdfRenderer;
    private final ReportSseEmitterService sseEmitterService;
    private final ObjectMapper objectMapper;
    private final DiscrepancyService discrepancyService;

    public ReportService(
            ReportRepository reportRepository,
            DocumentRepository documentRepository,
            @Qualifier("reportChatLanguageModel") ChatLanguageModel chatLanguageModel,
            HybridSearchService hybridSearchService,
            ReportPdfRenderer reportPdfRenderer,
            ReportSseEmitterService sseEmitterService,
            ObjectMapper objectMapper,
            DiscrepancyService discrepancyService) {
        this.reportRepository = reportRepository;
        this.documentRepository = documentRepository;
        this.chatLanguageModel = chatLanguageModel;
        this.hybridSearchService = hybridSearchService;
        this.reportPdfRenderer = reportPdfRenderer;
        this.sseEmitterService = sseEmitterService;
        this.objectMapper = objectMapper;
        this.discrepancyService = discrepancyService;
    }

    private static final UUID TEMP_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Transactional
    public ReportDto.GenerateResponse createReport(ReportDto.GenerateRequest request) {
        validateRequest(request);

        Report report = Report.builder()
                .userId(TEMP_USER_ID)
                .title(request.getTitle())
                .reportType(request.getReportType())
                .documentIds(request.getDocumentIds())
                .build();

        report = reportRepository.save(report);

        return ReportDto.GenerateResponse.builder()
                .reportId(report.getId())
                .status(report.getStatus())
                .build();
    }

    private void validateRequest(ReportDto.GenerateRequest request) {
        List<UUID> docIds = request.getDocumentIds();

        // 1. 문서 선택 필수
        if (docIds == null || docIds.isEmpty()) {
            throw BusinessException.badRequest("분석할 문서를 1개 이상 선택해 주세요.");
        }

        // 2. 중복 ID 제거
        List<UUID> uniqueIds = docIds.stream().distinct().toList();
        request.setDocumentIds(uniqueIds);

        // 3. 비교 분석은 2개 이상
        if (request.getReportType() == ReportType.COMPARISON && uniqueIds.size() < 2) {
            throw BusinessException.badRequest("비교 분석을 위해 2개 이상의 문서를 선택해 주세요.");
        }

        // 4. 문서 존재 여부 확인
        List<Document> docs = documentRepository.findAllById(uniqueIds);
        if (docs.size() != uniqueIds.size()) {
            throw BusinessException.badRequest("선택한 문서 중 존재하지 않는 문서가 있습니다.");
        }

        // 5. 파싱 완료(INDEXED) 상태인지 확인
        List<String> notReady = docs.stream()
                .filter(d -> d.getStatus() != DocumentStatus.INDEXED)
                .map(Document::getOriginalFilename)
                .toList();
        if (!notReady.isEmpty()) {
            throw BusinessException.badRequest(
                    "파싱이 완료된 문서만 사용 가능합니다: " + String.join(", ", notReady));
        }
    }

    /**
     * 리포트 생성 실행 (ReportAsyncExecutor에서 @Async로 호출됨)
     */
    public void generateReport(UUID reportId, ReportDto.GenerateRequest request) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> BusinessException.notFound("Report", reportId));

        try {
            // 1. GENERATING
            report.startGenerating();
            reportRepository.save(report);
            sendProgress(reportId, ReportStatus.GENERATING, "AI 분석 중...", 10);

            // 2. Build report-specific agent
            DocumentQueryTools queryTools = new DocumentQueryTools(hybridSearchService, discrepancyService, documentRepository);
            FinancialCalculatorTools calcTools = new FinancialCalculatorTools();

            IntelliDocsAgent agent = AiServices.builder(IntelliDocsAgent.class)
                    .chatLanguageModel(chatLanguageModel)
                    .chatMemoryProvider(memoryId ->
                            MessageWindowChatMemory.builder()
                                    .id(memoryId)
                                    .maxMessages(20)
                                    .build())
                    .tools(queryTools, calcTools)
                    .build();

            // 3. Build prompt based on report type
            String prompt = buildPrompt(request, report);
            log.info("[ReportService] Generating report {} with type={}", reportId, request.getReportType());

            sendProgress(reportId, ReportStatus.GENERATING, "문서 분석 및 데이터 수집 중...", 30);

            // 4. Call agent
            String agentResponse = agent.chat(reportId, prompt);

            sendProgress(reportId, ReportStatus.GENERATING, "분석 결과 정리 중...", 50);

            // 5. Parse response to ReportData
            ReportData reportData = parseReportData(agentResponse, request, report);

            // 6. RENDERING
            report.startRendering();
            reportRepository.save(report);
            sendProgress(reportId, ReportStatus.RENDERING, "PDF 렌더링 중...", 70);

            // 7. Render PDF
            Path pdfPath = reportPdfRenderer.renderPdf(reportId, reportData);
            long fileSize = Files.size(pdfPath);

            // 8. COMPLETED
            report.complete(pdfPath.toString(), fileSize, reportData);
            reportRepository.save(report);
            sendProgress(reportId, ReportStatus.COMPLETED, "리포트 생성 완료", 100);

            log.info("[ReportService] Report {} completed, PDF size={}KB", reportId, fileSize / 1024);

        } catch (Exception e) {
            log.error("[ReportService] Report {} failed: {}", reportId, e.getMessage(), e);
            report.fail(e.getMessage());
            reportRepository.save(report);
            sendProgress(reportId, ReportStatus.FAILED, "리포트 생성 실패: " + e.getMessage(), 0);
        } finally {
            sseEmitterService.complete(reportId);
        }
    }

    @Transactional(readOnly = true)
    public List<ReportDto.ListResponse> getReports() {
        return reportRepository.findByUserIdOrderByCreatedAtDesc(TEMP_USER_ID)
                .stream()
                .map(ReportDto.ListResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Report getReport(UUID reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> BusinessException.notFound("Report", reportId));
    }

    @Transactional
    public void deleteReport(UUID reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> BusinessException.notFound("Report", reportId));

        // PDF 파일 삭제
        if (report.getStoragePath() != null) {
            try {
                Files.deleteIfExists(Path.of(report.getStoragePath()));
            } catch (Exception e) {
                log.warn("[ReportService] Failed to delete PDF file: {}", e.getMessage());
            }
        }

        reportRepository.delete(report);
        log.info("[ReportService] Report {} deleted", reportId);
    }

    private void sendProgress(UUID reportId, ReportStatus status, String message, int progress) {
        sseEmitterService.send(reportId, ReportDto.StatusEvent.builder()
                .reportId(reportId)
                .status(status)
                .message(message)
                .progress(progress)
                .build());
    }

    private String buildPrompt(ReportDto.GenerateRequest request, Report report) {
        // Resolve document filenames for context
        String docContext = "";
        if (request.getDocumentIds() != null && !request.getDocumentIds().isEmpty()) {
            List<Document> docs = documentRepository.findAllById(request.getDocumentIds());
            docContext = docs.stream()
                    .map(d -> d.getOriginalFilename() + " (ID: " + d.getId() + ")")
                    .collect(Collectors.joining(", "));
        }

        String typePrompt = switch (request.getReportType()) {
            case FINANCIAL_ANALYSIS -> """
                    다음 문서들을 기반으로 종합 재무 분석 리포트를 작성하세요.
                    분석 축: 수익성, 안정성, 성장성, 효율성
                    각 축에 대해 핵심 지표를 검색하고 계산 도구로 비율을 산출하세요.
                    """;
            case COMPARISON -> """
                    다음 문서들을 비교 분석하여 리포트를 작성하세요.
                    핵심 지표를 기준으로 문서 간 차이점과 공통점을 분석하세요.
                    """;
            case SUMMARY -> """
                    다음 문서들의 핵심 내용을 종합 요약하는 리포트를 작성하세요.
                    주요 포인트, 핵심 수치, 결론을 중심으로 정리하세요.
                    """;
        };

        String customPrompt = request.getPrompt() != null ? "\n추가 지시사항: " + request.getPrompt() : "";

        return typePrompt + "\n대상 문서: " + docContext +
                "\n[검색 대상 문서 ID: " + (request.getDocumentIds() != null
                ? request.getDocumentIds().stream().map(UUID::toString).collect(Collectors.joining(", "))
                : "전체") + "]" +
                customPrompt +
                "\n\n" + REPORT_JSON_FORMAT;
    }

    private ReportData parseReportData(String agentResponse, ReportDto.GenerateRequest request, Report report) {
        // Try to extract JSON from agent response
        try {
            String json = extractJson(agentResponse);
            if (json != null) {
                ReportData parsed = objectMapper.readValue(json, ReportData.class);
                // generatedAt는 @JsonIgnore이므로 수동 설정
                if (parsed.getMetadata() != null) {
                    parsed.getMetadata().setGeneratedAt(LocalDateTime.now());
                }
                return parsed;
            }
        } catch (Exception e) {
            log.warn("[ReportService] Failed to parse JSON from agent response, building manually: {}", e.getMessage());
        }

        // Fallback: wrap the response as a single section
        return ReportData.builder()
                .title(request.getTitle())
                .summary("AI 분석 결과")
                .sections(List.of(
                        ReportData.Section.builder()
                                .heading("분석 결과")
                                .content(agentResponse)
                                .build()
                ))
                .metadata(ReportData.Metadata.builder()
                        .reportType(request.getReportType().name())
                        .generatedAt(LocalDateTime.now())
                        .build())
                .build();
    }

    private String extractJson(String text) {
        // Find JSON block between ```json ... ``` or { ... }
        int jsonStart = text.indexOf("```json");
        if (jsonStart >= 0) {
            int contentStart = text.indexOf('\n', jsonStart) + 1;
            int contentEnd = text.indexOf("```", contentStart);
            if (contentEnd > contentStart) {
                return text.substring(contentStart, contentEnd).trim();
            }
        }

        // Try to find raw JSON object
        int braceStart = text.indexOf('{');
        int braceEnd = text.lastIndexOf('}');
        if (braceStart >= 0 && braceEnd > braceStart) {
            return text.substring(braceStart, braceEnd + 1);
        }

        return null;
    }

    private static final String REPORT_JSON_FORMAT = """
            반드시 아래 JSON 형식으로 응답하세요. 마크다운이나 추가 텍스트 없이 JSON만 출력하세요.
            ```json
            {
              "title": "리포트 제목",
              "summary": "2-3문장의 핵심 요약",
              "sections": [
                {
                  "heading": "섹션 제목",
                  "content": "마크다운 형식의 본문 내용",
                  "tables": [
                    {
                      "caption": "표 제목",
                      "headers": ["항목", "값1", "값2"],
                      "rows": [["행1", "데이터", "데이터"]]
                    }
                  ]
                }
              ],
              "sources": [
                {
                  "documentId": "문서 UUID",
                  "filename": "파일명",
                  "pageRange": "1-5"
                }
              ],
              "metadata": {
                "reportType": "FINANCIAL_ANALYSIS",
                "confidenceLevel": "HIGH"
              }
            }
            ```
            """;
}
