package com.intellidocs.domain.agent.controller;

import com.intellidocs.common.dto.ApiResponse;
import com.intellidocs.domain.agent.dto.AgentRequest;
import com.intellidocs.domain.agent.dto.AgentResponse;
import com.intellidocs.domain.agent.service.RagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/agent")
@RequiredArgsConstructor
public class AgentController {

    private final RagService ragService;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AgentResponse>> chat(@RequestBody @Valid AgentRequest request) {
        log.info("[AgentController] question='{}'", request.getQuestion());
        AgentResponse response = ragService.chat(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
