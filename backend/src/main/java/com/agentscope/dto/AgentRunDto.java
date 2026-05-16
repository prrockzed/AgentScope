package com.agentscope.dto;

import java.time.Instant;
import java.util.UUID;

public record AgentRunDto(
        UUID id,
        String task,
        String status,
        Instant createdAt,
        Long totalLatency,
        Integer totalTokens,
        UUID replayOf
) {}
