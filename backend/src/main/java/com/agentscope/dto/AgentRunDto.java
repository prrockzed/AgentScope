package com.agentscope.dto;

import java.time.Instant;
import java.util.UUID;

public record AgentRunDto(
        UUID id,
        String status,
        Instant createdAt,
        Long totalLatency,
        Integer totalTokens
) {}
