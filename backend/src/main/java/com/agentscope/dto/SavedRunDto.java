package com.agentscope.dto;

import java.time.Instant;
import java.util.UUID;

public record SavedRunDto(
        UUID savedRunId,
        UUID runId,
        String task,
        String status,
        Long totalLatency,
        Integer totalTokens,
        Instant savedAt
) {}
