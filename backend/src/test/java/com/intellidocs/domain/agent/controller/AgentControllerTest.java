package com.intellidocs.domain.agent.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidocs.common.exception.BusinessException;
import com.intellidocs.config.SecurityConfig;
import com.intellidocs.domain.agent.dto.AgentRequest;
import com.intellidocs.domain.agent.dto.AgentResponse;
import com.intellidocs.domain.agent.service.RagService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
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

    @MockBean
    private RagService ragService;

    @Test
    void chat_returnsOk() throws Exception {
        AgentResponse response = AgentResponse.builder()
                .answer("Revenue grew 20%.")
                .sources(List.of())
                .confidence(0.75)
                .elapsedMs(300L)
                .build();
        when(ragService.chat(any())).thenReturn(response);

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
    void chat_badRequest_returns400() throws Exception {
        when(ragService.chat(any())).thenThrow(BusinessException.badRequest("질문을 입력해 주세요."));

        AgentRequest request = AgentRequest.builder()
                .question("   ")
                .build();

        mockMvc.perform(post("/api/v1/agent/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
