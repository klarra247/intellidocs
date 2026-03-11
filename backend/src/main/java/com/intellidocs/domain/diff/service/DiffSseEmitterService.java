package com.intellidocs.domain.diff.service;

import com.intellidocs.domain.diff.dto.DiffDto;
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
public class DiffSseEmitterService {

    private final Map<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();
    private final Map<UUID, List<DiffDto.StatusEvent>> eventBuffers = new ConcurrentHashMap<>();
    private final Map<UUID, Boolean> completed = new ConcurrentHashMap<>();

    public SseEmitter createEmitter(UUID diffId) {
        SseEmitter emitter = new SseEmitter(300_000L);
        emitter.onCompletion(() -> cleanup(diffId));
        emitter.onTimeout(    () -> cleanup(diffId));
        emitter.onError(e     -> cleanup(diffId));
        emitters.put(diffId, emitter);

        // 버퍼에 쌓인 이벤트 재생
        List<DiffDto.StatusEvent> buffered = eventBuffers.get(diffId);
        if (buffered != null) {
            for (DiffDto.StatusEvent event : buffered) {
                try {
                    emitter.send(SseEmitter.event().name("status").data(event));
                } catch (IOException e) {
                    log.warn("Failed to replay buffered SSE event for diff: {}", diffId);
                    emitters.remove(diffId);
                    return emitter;
                }
            }
        }

        if (completed.containsKey(diffId)) {
            emitter.complete();
            cleanup(diffId);
        }

        return emitter;
    }

    public void send(UUID diffId, DiffDto.StatusEvent event) {
        eventBuffers.computeIfAbsent(diffId, k -> new CopyOnWriteArrayList<>()).add(event);

        SseEmitter emitter = emitters.get(diffId);
        if (emitter == null) return;

        try {
            emitter.send(SseEmitter.event().name("status").data(event));
        } catch (IOException e) {
            log.warn("Failed to send SSE event for diff: {}", diffId);
            emitters.remove(diffId);
        }
    }

    public void complete(UUID diffId) {
        completed.put(diffId, true);

        SseEmitter emitter = emitters.remove(diffId);
        if (emitter != null) {
            emitter.complete();
            cleanup(diffId);
        }
    }

    private void cleanup(UUID diffId) {
        emitters.remove(diffId);
        eventBuffers.remove(diffId);
        completed.remove(diffId);
    }
}
