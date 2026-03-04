package com.intellidocs.domain.report.service;

import com.intellidocs.domain.report.dto.ReportDto;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * @Async가 Spring 프록시를 통해 작동하려면 호출자와 다른 빈이어야 한다.
 * Controller → ReportAsyncExecutor.execute() → ReportService.generateReport()
 * Controller에서 호출하므로 @Transactional 커밋 이후에 실행이 보장된다.
 */
@Component
@RequiredArgsConstructor
public class ReportAsyncExecutor {

    private final ReportService reportService;

    @Async
    public void execute(UUID reportId, ReportDto.GenerateRequest request) {
        reportService.generateReport(reportId, request);
    }
}
