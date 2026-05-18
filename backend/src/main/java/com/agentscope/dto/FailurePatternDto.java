package com.agentscope.dto;

import java.time.Instant;
import java.util.UUID;

public record FailurePatternDto(
        UUID id,
        String task,
        String agentType,
        String model,
        String failureReason,
        int occurrenceCount,
        Instant lastSeen,
        Instant createdAt
) {}
