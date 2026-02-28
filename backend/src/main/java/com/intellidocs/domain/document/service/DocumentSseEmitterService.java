package com.intellidocs.domain.document.service;

import com.intellidocs.domain.document.dto.DocumentDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class DocumentSseEmitterService {

    private final Map<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter createEmitter(UUID documentId) {
        SseEmitter emitter = new SseEmitter(300_000L); // 5분 타임아웃

        emitter.onCompletion(() -> emitters.remove(documentId));
        emitter.onTimeout(() -> emitters.remove(documentId));
        emitter.onError(e -> emitters.remove(documentId));

        emitters.put(documentId, emitter);
        return emitter;
    }

    public void send(UUID documentId, DocumentDto.StatusEvent event) {
        SseEmitter emitter = emitters.get(documentId);
        if (emitter == null) {
            return;
        }

        try {
            emitter.send(SseEmitter.event()
                    .name("status")
                    .data(event));
        } catch (IOException e) {
            log.warn("Failed to send SSE event for document: {}", documentId);
            emitters.remove(documentId);
        }
    }

    public void complete(UUID documentId) {
        SseEmitter emitter = emitters.remove(documentId);
        if (emitter != null) {
            emitter.complete();
        }
    }
}