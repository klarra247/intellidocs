package com.intellidocs.domain.agent.service;

import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;

public interface IntelliDocsAgent {

    @SystemMessage(AgentPrompts.SYSTEM_MESSAGE)
    String chat(@MemoryId Object memoryId, @UserMessage String userMessage);
}
