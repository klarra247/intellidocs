package com.intellidocs.domain.document.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

@Getter
public class DocumentIndexedEvent extends ApplicationEvent {

    private final UUID documentId;
    private final UUID userId;

    public DocumentIndexedEvent(Object source, UUID documentId, UUID userId) {
        super(source);
        this.documentId = documentId;
        this.userId = userId;
    }
}
