package com.intellidocs.domain.discrepancy.service;

import com.intellidocs.domain.discrepancy.dto.DiscrepancyDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class DiscrepancySseEmitterService {

    private final Map<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter createEmitter(UUID jobId) {
        SseEmitter emitter = new SseEmitter(300_000L); // 5분 타임아웃
        emitter.onCompletion(() -> emitters.remove(jobId));
        emitter.onTimeout(    () -> emitters.remove(jobId));
        emitter.onError(e     -> emitters.remove(jobId));
        emitters.put(jobId, emitter);
        return emitter;
    }

    public void send(UUID jobId, DiscrepancyDto.StatusEvent event) {
        SseEmitter emitter = emitters.get(jobId);
        if (emitter == null) return;

        try {
            emitter.send(SseEmitter.event()
                    .name("status")
                    .data(event));
        } catch (IOException e) {
            log.warn("Failed to send SSE event for discrepancy job: {}", jobId);
            emitters.remove(jobId);
        }
    }

    public void complete(UUID jobId) {
        SseEmitter emitter = emitters.remove(jobId);
        if (emitter != null) emitter.complete();
    }
}
