package com.agentscope.dto;

import java.time.Instant;
import java.util.UUID;

public record SuccessfulPatternDto(
        UUID id,
        String task,
        String agentType,
        String model,
        Long avgLatency,
        Integer avgTokens,
        int occurrenceCount,
        Instant lastSeen,
        Instant createdAt
) {}
