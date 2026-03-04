package com.intellidocs.domain.discrepancy.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * @Async가 Spring 프록시를 통해 작동하려면 호출자와 다른 빈이어야 한다.
 * Controller → DiscrepancyAsyncExecutor.execute() → DiscrepancyService.executeDetection()
 */
@Component
@RequiredArgsConstructor
public class DiscrepancyAsyncExecutor {

    private final DiscrepancyService discrepancyService;

    @Async
    public void execute(UUID jobId) {
        discrepancyService.executeDetection(jobId);
    }
}
