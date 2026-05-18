package com.agentscope.dto;

import java.time.Instant;
import java.util.UUID;

public record ModelInsightDto(
        UUID id,
        String model,
        int totalRuns,
        int successCount,
        int failureCount,
        double successRate,
        Long avgLatency,
        Integer avgTokens,
        Instant lastUpdated
) {}
