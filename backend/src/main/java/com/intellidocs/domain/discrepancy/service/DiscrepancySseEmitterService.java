package com.intellidocs.domain.discrepancy.service;

import com.intellidocs.domain.discrepancy.dto.DiscrepancyDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class DiscrepancySseEmitterService {

    private final Map<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final Map<UUID, List<DiscrepancyDto.StatusEvent>> eventBuffers = new ConcurrentHashMap<>();
    private final Map<UUID, Boolean> completed = new ConcurrentHashMap<>();

    public SseEmitter createEmitter(UUID jobId) {
        SseEmitter emitter = new SseEmitter(300_000L); // 5분 타임아웃
        emitter.onCompletion(() -> cleanup(jobId));
        emitter.onTimeout(    () -> cleanup(jobId));
        emitter.onError(e     -> cleanup(jobId));
        emitters.put(jobId, emitter);

        // 버퍼에 쌓인 이벤트 재생
        List<DiscrepancyDto.StatusEvent> buffered = eventBuffers.get(jobId);
        if (buffered != null) {
            for (DiscrepancyDto.StatusEvent event : buffered) {
                try {
                    emitter.send(SseEmitter.event().name("status").data(event));
                } catch (IOException e) {
                    log.warn("Failed to replay buffered SSE event for job: {}", jobId);
                    emitters.remove(jobId);
                    return emitter;
                }
            }
        }

        // 이미 완료된 작업이면 즉시 complete
        if (completed.containsKey(jobId)) {
            emitter.complete();
            cleanup(jobId);
        }

        return emitter;
    }

    public void send(UUID jobId, DiscrepancyDto.StatusEvent event) {
        // 항상 버퍼에 저장 (클라이언트 미연결 대비)
        eventBuffers.computeIfAbsent(jobId, k -> new CopyOnWriteArrayList<>()).add(event);

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
        completed.put(jobId, true);

        SseEmitter emitter = emitters.remove(jobId);
        if (emitter != null) {
            emitter.complete();
            cleanup(jobId);
        }
        // emitter가 없으면 cleanup하지 않음 — 클라이언트가 나중에 연결할 수 있으므로 버퍼 유지
    }

    private void cleanup(UUID jobId) {
        emitters.remove(jobId);
        eventBuffers.remove(jobId);
        completed.remove(jobId);
    }
}
