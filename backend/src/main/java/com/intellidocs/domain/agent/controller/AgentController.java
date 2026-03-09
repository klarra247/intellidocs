package com.intellidocs.domain.agent.controller;

import com.intellidocs.common.SecurityContextHelper;
import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.agent.dto.AgentRequest;
import com.intellidocs.domain.agent.dto.AgentResponse;
import com.intellidocs.domain.agent.service.AgentService;
import com.intellidocs.domain.agent.service.StreamingAgentService;
import com.intellidocs.domain.chat.dto.ChatHistoryResponse;
import com.intellidocs.domain.chat.service.ChatHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/agent")
@RequiredArgsConstructor
public class AgentController {

    private final AgentService agentService;
    private final StreamingAgentService streamingAgentService;
    private final ChatHistoryService chatHistoryService;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AgentResponse>> chat(@RequestBody @Valid AgentRequest request) {
        log.info("[AgentController] question='{}', sessionId={}", request.getQuestion(), request.getSessionId());
        AgentResponse response = agentService.chat(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(@RequestBody @Valid AgentRequest request) {
        log.info("[AgentController] stream question='{}', sessionId={}",
                request.getQuestion(), request.getSessionId());
        UUID userId = SecurityContextHelper.getCurrentUserId();
        return streamingAgentService.streamChat(request, userId);
    }

    @GetMapping("/chat/history")
    public ResponseEntity<ApiResponse<ChatHistoryResponse>> getChatHistory(
            @RequestParam UUID sessionId) {
        log.info("[AgentController] history sessionId={}", sessionId);
        UUID userId = SecurityContextHelper.getCurrentUserId();
        ChatHistoryResponse history = chatHistoryService.getHistory(sessionId, userId);
        return ResponseEntity.ok(ApiResponse.ok(history));
    }
}
