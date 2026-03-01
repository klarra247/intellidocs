package com.intellidocs.domain.agent.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.config.SecurityConfig;
import com.intellidocs.domain.agent.dto.AgentRequest;
import com.intellidocs.domain.agent.dto.AgentResponse;
import com.intellidocs.domain.agent.service.AgentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AgentController.class)
@Import(SecurityConfig.class)
class AgentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AgentService agentService;

    @Test
    void chat_returnsOk() throws Exception {
        AgentResponse response = AgentResponse.builder()
                .answer("Revenue grew 20%.")
                .sources(List.of())
                .confidence(0.75)
                .elapsedMs(300L)
                .build();
        when(agentService.chat(any())).thenReturn(response);

        AgentRequest request = AgentRequest.builder()
                .question("What is the revenue growth?")
                .build();

        mockMvc.perform(post("/api/v1/agent/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.answer").value("Revenue grew 20%."))
                .andExpect(jsonPath("$.data.confidence").value(0.75));
    }

    @Test
    void chat_blankQuestion_returns400() throws Exception {
        AgentRequest request = AgentRequest.builder()
                .question("   ")
                .build();

        mockMvc.perform(post("/api/v1/agent/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void chat_serviceThrowsBusinessException_returns400() throws Exception {
        when(agentService.chat(any())).thenThrow(BusinessException.badRequest("LLM API 키가 설정되지 않았습니다."));

        AgentRequest request = AgentRequest.builder()
                .question("What is the revenue?")
                .build();

        mockMvc.perform(post("/api/v1/agent/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
