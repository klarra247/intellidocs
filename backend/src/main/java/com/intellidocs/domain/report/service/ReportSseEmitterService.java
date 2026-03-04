package com.intellidocs.domain.report.service;

import com.intellidocs.domain.report.dto.ReportDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class ReportSseEmitterService {

    private final Map<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter createEmitter(UUID reportId) {
        SseEmitter emitter = new SseEmitter(300_000L); // 5분 타임아웃

        emitter.onCompletion(() -> emitters.remove(reportId));
        emitter.onTimeout(() -> emitters.remove(reportId));
        emitter.onError(e -> emitters.remove(reportId));

        emitters.put(reportId, emitter);
        return emitter;
    }

    public void send(UUID reportId, ReportDto.StatusEvent event) {
        SseEmitter emitter = emitters.get(reportId);
        if (emitter == null) {
            return;
        }

        try {
            emitter.send(SseEmitter.event()
                    .name("status")
                    .data(event));
        } catch (IOException e) {
            log.warn("Failed to send SSE event for report: {}", reportId);
            emitters.remove(reportId);
        }
    }

    public void complete(UUID reportId) {
        SseEmitter emitter = emitters.remove(reportId);
        if (emitter != null) {
            emitter.complete();
        }
    }
}
