package com.intellidocs.domain.agent.service;

import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.TokenStream;
import dev.langchain4j.service.UserMessage;

public interface StreamingIntelliDocsAgent {

    @SystemMessage(AgentPrompts.SYSTEM_MESSAGE)
    TokenStream chat(@MemoryId Object memoryId, @UserMessage String userMessage);
}
