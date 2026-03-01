package com.intellidocs.domain.agent.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentRequest {
    /** User's question */
    @NotBlank
    private String question;
    /** Optional: restrict search to these documents */
    private List<UUID> documentIds;
    /** Optional: carry conversation session context */
    private UUID sessionId;
}
