package com.intellidocs.domain.agent.dto;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class AgentRequest {
    /** User's question */
    private String question;
    /** Optional: restrict search to these documents */
    private List<UUID> documentIds;
    /** Optional: carry conversation session context */
    private UUID sessionId;
}
