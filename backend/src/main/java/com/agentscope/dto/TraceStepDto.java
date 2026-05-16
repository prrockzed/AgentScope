package com.agentscope.dto;

import java.time.Instant;
import java.util.UUID;

public record TraceStepDto(
        UUID id,
        UUID runId,
        int stepNumber,
        String toolName,
        String eventType,
        String prompt,
        String response,
        long latency,
        int tokenUsage,
        String status,
        Instant createdAt
) {}
