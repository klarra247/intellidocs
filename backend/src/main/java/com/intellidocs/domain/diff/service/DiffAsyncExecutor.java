package com.intellidocs.domain.diff.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DiffAsyncExecutor {

    private final DiffService diffService;

    @Async
    public void execute(UUID diffId) {
        diffService.executeDiff(diffId);
    }
}
