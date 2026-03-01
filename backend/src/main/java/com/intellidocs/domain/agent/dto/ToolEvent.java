package com.intellidocs.domain.agent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class ToolEvent {
    private final String eventType; // "tool_start" or "tool_end"
    private final String tool;
    private final String message;

    public static ToolEvent start(String tool, String message) {
        return new ToolEvent("tool_start", tool, message);
    }

    public static ToolEvent end(String tool, String message) {
        return new ToolEvent("tool_end", tool, message);
    }
}
